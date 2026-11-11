package com.aishop.backend.service;

import com.aishop.backend.dto.CheckoutSessionResponse;
import com.aishop.backend.dto.PaymentStatusResponse;
import com.aishop.backend.entity.Order;
import com.aishop.backend.entity.OrderStatus;
import com.aishop.backend.repository.OrderRepository;
import tools.jackson.databind.ObjectMapper;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class StripeService {
    private final OrderRepository orders;
    private final StripeGateway gateway;
    private final String frontendUrl;
    private final OrderCancellationService cancellation;

    public StripeService(OrderRepository orders, StripeGateway gateway, OrderCancellationService cancellation,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.orders = orders; this.gateway = gateway; this.cancellation=cancellation; this.frontendUrl = frontendUrl;
    }

    @Transactional
    public CheckoutSessionResponse createCheckoutSession(Long userId, Long orderId) throws StripeException {
        Order order = owned(userId, orderId);
        if (!"UNPAID".equals(order.getPaymentStatus()) || order.getStatus() == OrderStatus.CANCELLED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Narudžba je već plaćena ili otkazana.");
        if (order.getStripeSessionId() != null) {
            Session existing = gateway.retrieve(order.getStripeSessionId());
            confirm(order, existing);
            if (!"expired".equals(existing.getStatus()))
                return new CheckoutSessionResponse(existing.getUrl(), existing.getId());
            order.setPaymentAttempt(order.getPaymentAttempt()+1);
        }
        long minor = order.getTotalAmount().movePointRight(2).longValueExact();
        if (minor <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Neispravan iznos narudžbe.");
        var price = SessionCreateParams.LineItem.PriceData.builder()
                .setCurrency("bam").setUnitAmount(minor)
                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("AIShop narudžba #" + orderId).build()).build();
        var params = SessionCreateParams.builder().setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(frontendUrl + "/checkout/success?sessionId={CHECKOUT_SESSION_ID}")
                .setCancelUrl(frontendUrl + "/checkout/cancel?orderId=" + orderId)
                .setClientReferenceId("order-" + orderId).putMetadata("orderId", orderId.toString())
                .addLineItem(SessionCreateParams.LineItem.builder().setPriceData(price).setQuantity(1L).build())
                .build();
        Session session = gateway.create(params, "aishop-order-bam-v2-" + orderId + "-" + order.getPaymentAttempt());
        order.setStripeSessionId(session.getId());
        order.setPaymentAmountMinor(minor); order.setPaymentCurrency("bam");
        orders.saveAndFlush(order);
        return new CheckoutSessionResponse(session.getUrl(), session.getId());
    }

    @Transactional
    public PaymentStatusResponse sessionStatus(Long userId, String sessionId) throws StripeException {
        Order order = orders.findByStripeSessionId(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plaćanje nije pronađeno."));
        order = owned(userId, order.getId());
        Session session = gateway.retrieve(sessionId);
        confirm(order, session);
        return new PaymentStatusResponse(order.getId(), order.getPaymentStatus(), session.getStatus());
    }

    @Transactional
    public void handleEvent(Event event) throws StripeException {
        if ("refund.created".equals(event.getType()) || "refund.updated".equals(event.getType()) || "refund.failed".equals(event.getType())) {
            String id=new ObjectMapper().readTree(event.getDataObjectDeserializer().getRawJson()).path("id").asText();
            Order found=orders.findByStripeRefundId(id).orElse(null);
            if(found!=null) syncRefund(orders.findForPayment(found.getId()).orElseThrow(), gateway.retrieveRefund(id));
            return;
        }
        if (!"checkout.session.completed".equals(event.getType()) &&
                !"checkout.session.async_payment_succeeded".equals(event.getType())) return;
        // Read only the id from the signed payload; retrieve authoritative data with our own API key.
        String sessionId = new ObjectMapper().readTree(event.getDataObjectDeserializer().getRawJson()).path("id").asText();
        Order found = orders.findByStripeSessionId(sessionId).orElse(null);
        if (found == null) return; // An unrelated session is not an application order.
        Order order = orders.findForPayment(found.getId()).orElseThrow();
        confirm(order, gateway.retrieve(sessionId));
    }

    @Transactional
    public PaymentStatusResponse cancelOrder(Long userId, Long orderId, boolean admin) throws StripeException {
        Order order=admin ? orders.findForPayment(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)) : owned(userId,orderId);
        if(order.getStatus()==OrderStatus.CANCELLED) return result(order);
        requireUnsent(order);
        if(order.getStripeSessionId()!=null) {
            Session session=gateway.retrieve(order.getStripeSessionId());
            confirm(order,session);
            if(!"UNPAID".equals(order.getPaymentStatus())) return result(order);
            if("open".equals(session.getStatus())) {
                // Expire before restoring stock. A concurrent payment makes Stripe reject expiration.
                session=gateway.expire(session.getId());
                confirm(order,session);
            }
            if(!"expired".equals(session.getStatus()))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Plaćanje je još u obradi. Provjerite ponovo.");
        }
        if(!"UNPAID".equals(order.getPaymentStatus()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Plaćena narudžba zahtijeva povrat novca.");
        cancellation.restoreAndCancel(order); orders.saveAndFlush(order); return result(order);
    }

    @Transactional
    public PaymentStatusResponse refundOrder(Long orderId) throws StripeException {
        Order order=orders.findForPayment(orderId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if("REFUNDED".equals(order.getPaymentStatus())) return result(order);
        requireUnsent(order);
        if(order.getStripeRefundId()!=null) {
            syncRefund(order,gateway.retrieveRefund(order.getStripeRefundId())); return result(order);
        }
        if(order.getStripeSessionId()==null)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Nema Stripe naplate za ovu narudžbu.");
        Session session=gateway.retrieve(order.getStripeSessionId()); confirm(order,session);
        if(!"PAID".equals(order.getPaymentStatus()) || session.getPaymentIntent()==null)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Uplata još nije potvrđena.");
        var refund=gateway.refund(session.getPaymentIntent(),order.getPaymentAmountMinor(),"aishop-refund-v1-"+orderId);
        order.setStripeRefundId(refund.getId()); syncRefund(order,refund); return result(order);
    }
    private void syncRefund(Order order, com.stripe.model.Refund refund) throws StripeException {
        Session session=gateway.retrieve(order.getStripeSessionId());
        if(!java.util.Objects.equals(refund.getId(),order.getStripeRefundId()) ||
                !java.util.Objects.equals(refund.getPaymentIntent(),session.getPaymentIntent()) ||
                !java.util.Objects.equals(refund.getAmount(),order.getPaymentAmountMinor()) || !"bam".equals(refund.getCurrency()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Povrat ne odgovara ovoj narudžbi.");
        if("SUCCEEDED".equals(order.getRefundStatus())) return;
        switch(refund.getStatus()) {
            case "succeeded" -> {
                order.setRefundStatus("SUCCEEDED"); order.setPaymentStatus("REFUNDED");
                cancellation.restoreAndCancel(order);
            }
            case "failed", "canceled" -> order.setRefundStatus("FAILED");
            default -> order.setRefundStatus("PENDING");
        }
        orders.saveAndFlush(order);
    }
    private void requireUnsent(Order order) {
        if(order.getStatus()!=OrderStatus.PENDING && order.getStatus()!=OrderStatus.CONFIRMED)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Povrat poslane robe mora se prvo obraditi zasebno.");
    }
    private PaymentStatusResponse result(Order order) {
        return new PaymentStatusResponse(order.getId(),order.getPaymentStatus(),order.getStatus().name());
    }
    private Order owned(Long userId, Long orderId) {
        Order order = orders.findForPayment(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Narudžba nije pronađena."));
        if (!order.getUser().getId().equals(userId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Narudžba nije pronađena.");
        return order;
    }

    private void confirm(Order order, Session session) {
        if (!session.getId().equals(order.getStripeSessionId()) ||
                !"bam".equals(session.getCurrency()) ||
                !java.util.Objects.equals(session.getAmountTotal(), order.getPaymentAmountMinor()) ||
                session.getMetadata() == null ||
                !order.getId().toString().equals(session.getMetadata().get("orderId")))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Podaci plaćanja ne odgovaraju narudžbi.");
        if ("paid".equals(session.getPaymentStatus())) {
            boolean changed = false;
            if ("UNPAID".equals(order.getPaymentStatus())) {
                order.setPaymentStatus("PAID");
                order.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
                changed = true;
            }
            if ("PAID".equals(order.getPaymentStatus()) && order.getStatus() == OrderStatus.PENDING) {
                order.setStatus(OrderStatus.CONFIRMED);
                changed = true;
            }
            if (changed) orders.saveAndFlush(order);
        }
    }
}
