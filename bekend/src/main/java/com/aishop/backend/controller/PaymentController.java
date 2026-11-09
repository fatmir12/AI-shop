package com.aishop.backend.controller;

import com.aishop.backend.dto.CheckoutSessionResponse;
import com.aishop.backend.dto.OrderResponse;
import com.aishop.backend.service.OrderService;
import com.aishop.backend.service.StripeService;
import com.stripe.exception.StripeException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/checkout")
@Slf4j
public class PaymentController {

	private final StripeService stripeService;
	private final OrderService orderService;

	public PaymentController(StripeService stripeService, OrderService orderService) {
		this.stripeService = stripeService;
		this.orderService = orderService;
	}

	@PostMapping("/create-session")
	public CheckoutSessionResponse createCheckoutSession(
			@RequestParam Long orderId,
			@AuthenticationPrincipal Jwt jwt) {

		try {
			String userId = jwt.getClaimAsString("sub");

			OrderResponse orderResponse = orderService.getMyOrder(Long.parseLong(userId), orderId);

			if (orderResponse == null) {
				throw new ResponseStatusException(
					HttpStatus.NOT_FOUND,
					"Order not found"
				);
			}

			return stripeService.createCheckoutSession(orderResponse);

		} catch (StripeException e) {
			log.error("Stripe error creating checkout session: {}", e.getMessage());
			throw new ResponseStatusException(
				HttpStatus.INTERNAL_SERVER_ERROR,
				"Error creating checkout session"
			);
		}
	}
}
