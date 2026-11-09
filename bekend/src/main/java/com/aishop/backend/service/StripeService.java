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

    public StripeService(OrderRepository orders, StripeGateway gateway,
            @Value("${app.frontend.url:http://localhost:5173}") String frontendUrl) {
        this.orders = orders; this.gateway = gateway; this.frontendUrl = frontendUrl;
    }

    @Transactional
    public CheckoutSessionResponse createCheckoutSession(Long userId, Long orderId) throws StripeException {
        Order order = owned(userId, orderId);
        if ("PAID".equals(order.getPaymentStatus()) || order.getStatus() == OrderStatus.CANCELLED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Narudžba je već plaćena ili otkazana.");
        if (order.getStripeSessionId() != null) {
            Session existing = gateway.retrieve(order.getStripeSessionId());
            confirm(order, existing);
            if ("paid".equals(existing.getPaymentStatus()) || !"open".equals(existing.getStatus()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Plaćanje je završeno ili je sesija istekla. Provjerite narudžbu.");
            return new CheckoutSessionResponse(existing.getUrl(), existing.getId());
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
        Session session = gateway.create(params, "aishop-order-bam-v1-" + orderId);
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
        if (!"checkout.session.completed".equals(event.getType()) &&
                !"checkout.session.async_payment_succeeded".equals(event.getType())) return;
        // Read only the id from the signed payload; retrieve authoritative data with our own API key.
        String sessionId = new ObjectMapper().readTree(event.getDataObjectDeserializer().getRawJson()).path("id").asText();
        Order found = orders.findByStripeSessionId(sessionId).orElse(null);
        if (found == null) return; // An unrelated session is not an application order.
        Order order = orders.findForPayment(found.getId()).orElseThrow();
        confirm(order, gateway.retrieve(sessionId));
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
        if ("paid".equals(session.getPaymentStatus()) && !"PAID".equals(order.getPaymentStatus())) {
            order.setPaymentStatus("PAID"); order.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
            orders.saveAndFlush(order);
        }
    }
}