package com.aishop.backend.service;

import com.aishop.backend.entity.*;
import com.aishop.backend.repository.OrderRepository;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StripeServiceTests {
    OrderRepository orders;
    StripeGateway gateway;
    StripeService service;
    Order order;
    @BeforeEach void setup() {
        orders = mock(OrderRepository.class); gateway = mock(StripeGateway.class);
        service = new StripeService(orders, gateway, "http://localhost:5173");
        User user = new User(); user.setId(7L);
        order = new Order(); order.setId(4L); order.setUser(user);
        order.setStatus(OrderStatus.PENDING); order.setTotalAmount(new BigDecimal("649.99"));
        when(orders.findForPayment(4L)).thenReturn(Optional.of(order));
    }
    Session session(String state, String payment) {
        Session s = new Session(); s.setId("cs_test_order4"); s.setUrl("https://checkout.stripe.com/test");
        s.setStatus(state); s.setPaymentStatus(payment); s.setCurrency("bam");
        s.setAmountTotal(64999L); s.setMetadata(Map.of("orderId", "4")); return s;
    }
    void bind() throws Exception {
        order.setStripeSessionId("cs_test_order4"); order.setPaymentAmountMinor(64999L); order.setPaymentCurrency("bam");
        when(orders.findByStripeSessionId("cs_test_order4")).thenReturn(Optional.of(order));
    }
    @Test void sendsExactBamTotalAndStableIdempotencyKey() throws Exception {
        when(gateway.create(any(), anyString())).thenReturn(session("open", "unpaid"));
        service.createCheckoutSession(7L, 4L);
        var params = ArgumentCaptor.forClass(SessionCreateParams.class);
        verify(gateway).create(params.capture(), eq("aishop-order-bam-v1-4"));
        assertEquals("bam", params.getValue().getLineItems().getFirst().getPriceData().getCurrency());
        assertEquals(64999L, params.getValue().getLineItems().getFirst().getPriceData().getUnitAmount());
        assertEquals(1L, params.getValue().getLineItems().getFirst().getQuantity());
        assertEquals("cs_test_order4", order.getStripeSessionId());
    }
    @Test void retryReusesExistingOpenSession() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("open", "unpaid"));
        assertEquals("cs_test_order4", service.createCheckoutSession(7L, 4L).getSessionId());
        verify(gateway, never()).create(any(), anyString());
    }
    @Test void onlyOwningCustomerMayOpenOrInspectPayment() throws Exception {
        bind(); assertThrows(ResponseStatusException.class, () -> service.createCheckoutSession(8L, 4L));
        assertThrows(ResponseStatusException.class, () -> service.sessionStatus(8L, "cs_test_order4"));
        verifyNoInteractions(gateway);
    }
    @Test void unpaidSessionNeverMarksOrderPaid() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("open", "unpaid"));
        assertEquals("UNPAID", service.sessionStatus(7L, "cs_test_order4").paymentStatus());
        assertNull(order.getPaidAt());
    }
    @Test void paidConfirmationIsIdempotentAndDoesNotChangeDeliveryStatus() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("complete", "paid"));
        assertEquals("PAID", service.sessionStatus(7L, "cs_test_order4").paymentStatus());
        var paidAt = order.getPaidAt(); service.sessionStatus(7L, "cs_test_order4");
        assertEquals(paidAt, order.getPaidAt()); assertEquals(OrderStatus.PENDING, order.getStatus());
        verify(orders, times(1)).saveAndFlush(order);
    }
    @Test void mismatchedAmountCurrencyAndMetadataCannotConfirmPayment() throws Exception {
        bind(); Session bad = session("complete", "paid"); bad.setAmountTotal(1L);
        when(gateway.retrieve(anyString())).thenReturn(bad);
        assertThrows(ResponseStatusException.class, () -> service.sessionStatus(7L, "cs_test_order4"));
        bad.setAmountTotal(64999L); bad.setCurrency("eur");
        assertThrows(ResponseStatusException.class, () -> service.sessionStatus(7L, "cs_test_order4"));
        bad.setCurrency("bam"); bad.setMetadata(Map.of("orderId", "5"));
        assertThrows(ResponseStatusException.class, () -> service.sessionStatus(7L, "cs_test_order4"));
        assertEquals("UNPAID", order.getPaymentStatus());
    }
    @Test void paidOrCancelledOrdersCannotStartAnotherPayment() {
        order.setPaymentStatus("PAID");
        assertThrows(ResponseStatusException.class, () -> service.createCheckoutSession(7L, 4L));
        order.setPaymentStatus("UNPAID"); order.setStatus(OrderStatus.CANCELLED);
        assertThrows(ResponseStatusException.class, () -> service.createCheckoutSession(7L, 4L));
        verifyNoInteractions(gateway);
    }
    @Test void duplicateSignedEventsUseStripeDataAndOnlyRecordPaymentOnce() throws Exception {
        bind();
        var event = mock(com.stripe.model.Event.class);
        var data = mock(com.stripe.model.EventDataObjectDeserializer.class);
        when(event.getType()).thenReturn("checkout.session.completed");
        when(event.getDataObjectDeserializer()).thenReturn(data);
        when(data.getRawJson()).thenReturn("{\"id\":\"cs_test_order4\"}");
        when(gateway.retrieve("cs_test_order4")).thenReturn(session("complete", "paid"));
        service.handleEvent(event); service.handleEvent(event);
        assertEquals("PAID", order.getPaymentStatus());
        verify(orders, times(1)).saveAndFlush(order);
    }}