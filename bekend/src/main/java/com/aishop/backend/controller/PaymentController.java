package com.aishop.backend.controller;

import com.aishop.backend.dto.CheckoutSessionResponse;
import com.aishop.backend.dto.PaymentStatusResponse;
import com.aishop.backend.service.StripeService;
import com.stripe.exception.StripeException;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/checkout")
public class PaymentController {
    private final StripeService stripe;
    private final String webhookSecret;
    public PaymentController(StripeService stripe,
            @Value("${stripe.webhook.secret:}") String webhookSecret) {
        this.stripe = stripe; this.webhookSecret = webhookSecret;
    }
    @PostMapping("/create-session")
    public CheckoutSessionResponse create(@RequestParam Long orderId, @AuthenticationPrincipal Jwt jwt) {
        try { return stripe.createCheckoutSession(Long.valueOf(jwt.getSubject()), orderId); }
        catch (StripeException e) { throw unavailable(); }
    }
    @GetMapping("/session-status")
    public PaymentStatusResponse status(@RequestParam String sessionId, @AuthenticationPrincipal Jwt jwt) {
        try { return stripe.sessionStatus(Long.valueOf(jwt.getSubject()), sessionId); }
        catch (StripeException e) { throw unavailable(); }
    }
    @PostMapping("/cancel")
    public PaymentStatusResponse cancel(@RequestParam Long orderId, @AuthenticationPrincipal Jwt jwt) {
        try { return stripe.cancelOrder(Long.valueOf(jwt.getSubject()), orderId, "ADMIN".equals(jwt.getClaimAsString("role"))); }
        catch (StripeException e) { throw unavailable(); }
    }
    @PostMapping("/refund")
    public PaymentStatusResponse refund(@RequestParam Long orderId) {
        try { return stripe.refundOrder(orderId); }
        catch (StripeException e) { throw unavailable(); }
    }    @PostMapping("/webhook")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void webhook(@RequestBody String payload,
            @RequestHeader(value="Stripe-Signature", required=false) String signature) {
        if (webhookSecret.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        if (signature == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        try { stripe.handleEvent(Webhook.constructEvent(payload, signature, webhookSecret)); }
        catch (SignatureVerificationException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Neispravan potpis događaja.");
        } catch (StripeException e) { throw unavailable(); }
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Plaćanje trenutno nije dostupno. Pokušajte ponovo.");
    }
}