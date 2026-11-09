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
    OrderCancellationService cancellation;
    Order order;
    @BeforeEach void setup() {
        orders = mock(OrderRepository.class); gateway = mock(StripeGateway.class);
        cancellation=mock(OrderCancellationService.class);
        service = new StripeService(orders, gateway, cancellation, "http://localhost:5173");
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
        verify(gateway).create(params.capture(), eq("aishop-order-bam-v2-4-0"));
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
    }    @Test void expiredSessionGetsANewAttemptWithStableNewKey() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("expired","unpaid"));
        Session replacement=session("open","unpaid"); replacement.setId("cs_test_recovered");
        when(gateway.create(any(),anyString())).thenReturn(replacement);
        assertEquals("cs_test_recovered",service.createCheckoutSession(7L,4L).getSessionId());
        assertEquals(1,order.getPaymentAttempt());
        verify(gateway).create(any(),eq("aishop-order-bam-v2-4-1"));
    }
    @Test void unpaidCancellationExpiresBeforeRestockingAndIsRepeatable() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("open","unpaid"));
        when(gateway.expire(anyString())).thenReturn(session("expired","unpaid"));
        doAnswer(call -> {order.setStatus(OrderStatus.CANCELLED);return null;}).when(cancellation).restoreAndCancel(order);
        service.cancelOrder(7L,4L,false); service.cancelOrder(7L,4L,false);
        var sequence=inOrder(gateway,cancellation);
        sequence.verify(gateway).retrieve("cs_test_order4");sequence.verify(gateway).expire("cs_test_order4");
        sequence.verify(cancellation).restoreAndCancel(order);
        verify(cancellation,times(1)).restoreAndCancel(order);
    }
    @Test void paymentWinningCancellationRaceDoesNotRestoreStock() throws Exception {
        bind(); when(gateway.retrieve(anyString())).thenReturn(session("complete","paid"));
        assertEquals("PAID",service.cancelOrder(7L,4L,false).paymentStatus());
        verifyNoInteractions(cancellation); verify(gateway,never()).expire(anyString());
    }
    @Test void cancellationDoesNotTouchAnotherUsersOrder() {
        assertThrows(ResponseStatusException.class,()->service.cancelOrder(8L,4L,false));
        verifyNoInteractions(gateway,cancellation);
    }
    com.stripe.model.Refund refund(String status) {
        var r=new com.stripe.model.Refund();r.setId("re_test4");r.setAmount(64999L);
        r.setPaymentIntent("pi_test4");r.setCurrency("bam");r.setStatus(status);return r;
    }
    Session paidSession() {
        Session s=session("complete","paid");s.setPaymentIntent("pi_test4");return s;
    }
    @Test void successfulRefundRestocksOnceAndCannotBeRefundedTwice() throws Exception {
        bind();order.setPaymentStatus("PAID");when(gateway.retrieve(anyString())).thenReturn(paidSession());
        when(gateway.refund(anyString(),anyLong(),anyString())).thenReturn(refund("succeeded"));
        doAnswer(call->{order.setStatus(OrderStatus.CANCELLED);return null;}).when(cancellation).restoreAndCancel(order);
        service.refundOrder(4L);service.refundOrder(4L);
        assertEquals("REFUNDED",order.getPaymentStatus());assertEquals("SUCCEEDED",order.getRefundStatus());
        verify(gateway,times(1)).refund("pi_test4",64999L,"aishop-refund-v1-4");
        verify(cancellation,times(1)).restoreAndCancel(order);
    }
    @Test void pendingRefundDoesNotClaimSuccessOrRestoreStockUntilConfirmed() throws Exception {
        bind();order.setPaymentStatus("PAID");when(gateway.retrieve(anyString())).thenReturn(paidSession());
        when(gateway.refund(anyString(),anyLong(),anyString())).thenReturn(refund("pending"));
        service.refundOrder(4L);assertEquals("PENDING",order.getRefundStatus());assertEquals("PAID",order.getPaymentStatus());
        verifyNoInteractions(cancellation);
        when(gateway.retrieveRefund("re_test4")).thenReturn(refund("succeeded"));
        service.refundOrder(4L);assertEquals("REFUNDED",order.getPaymentStatus());verify(cancellation).restoreAndCancel(order);
        verify(gateway,times(1)).refund(anyString(),anyLong(),anyString());
    }
    @Test void shippedOrdersCannotBeRefundedOrCancelledWithoutReturnHandling() {
        order.setStatus(OrderStatus.SHIPPED);
        assertThrows(ResponseStatusException.class,()->service.refundOrder(4L));
        assertThrows(ResponseStatusException.class,()->service.cancelOrder(7L,4L,false));
        verifyNoInteractions(gateway,cancellation);
    }
    @Test void mismatchedRefundCannotRestoreStock() throws Exception {
        bind();order.setPaymentStatus("PAID");when(gateway.retrieve(anyString())).thenReturn(paidSession());
        var bad=refund("succeeded");bad.setAmount(1L);
        when(gateway.refund(anyString(),anyLong(),anyString())).thenReturn(bad);
        assertThrows(ResponseStatusException.class,()->service.refundOrder(4L));verifyNoInteractions(cancellation);
    }
}