package com.aishop.backend.service;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.model.Refund;
import com.stripe.net.RequestOptions;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import org.springframework.stereotype.Component;

@Component
public class StripeGateway {
    public Session create(SessionCreateParams params, String key) throws StripeException {
        return Session.create(params, RequestOptions.builder().setIdempotencyKey(key).build());
    }
    public Session retrieve(String id) throws StripeException { return Session.retrieve(id); }
    public Session expire(String id) throws StripeException { return Session.retrieve(id).expire(); }
    public Refund refund(String paymentIntent, long amount, String key) throws StripeException {
        return Refund.create(RefundCreateParams.builder().setPaymentIntent(paymentIntent).setAmount(amount).build(),
                RequestOptions.builder().setIdempotencyKey(key).build());
    }
    public Refund retrieveRefund(String id) throws StripeException { return Refund.retrieve(id); }
}