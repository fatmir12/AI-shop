package com.aishop.backend.service;

import com.aishop.backend.dto.CheckoutSessionResponse;
import com.aishop.backend.dto.OrderResponse;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class StripeService {

	@Value("${app.frontend.url:http://localhost:5173}")
	private String frontendUrl;

	public CheckoutSessionResponse createCheckoutSession(OrderResponse orderResponse) 
			throws StripeException {

		List<SessionCreateParams.LineItem> lineItems = new ArrayList<>();

		// Ako orderResponse ima items - koristi ih
		if (orderResponse.items() != null && !orderResponse.items().isEmpty()) {
			orderResponse.items().forEach(item -> {
				lineItems.add(
					SessionCreateParams.LineItem.builder()
						.setPriceData(
							SessionCreateParams.LineItem.PriceData.builder()
								.setCurrency("eur")
								.setUnitAmount(item.unitPrice().multiply(java.math.BigDecimal.valueOf(100)).longValue())
								.setProductData(
									SessionCreateParams.LineItem.PriceData.ProductData.builder()
										.setName(item.productName())
										.build()
								)
								.build()
						)
						.setQuantity(item.quantity().longValue())
						.build()
				);
			});
		} else {
			// Ako nema items, kreiraj jedan item sa total amount
			lineItems.add(
				SessionCreateParams.LineItem.builder()
					.setPriceData(
						SessionCreateParams.LineItem.PriceData.builder()
							.setCurrency("eur")
							.setUnitAmount(orderResponse.totalAmount().multiply(java.math.BigDecimal.valueOf(100)).longValue())
							.setProductData(
								SessionCreateParams.LineItem.PriceData.ProductData.builder()
									.setName("Order #" + orderResponse.id())
									.build()
							)
							.build()
					)
					.setQuantity(1L)
					.build()
			);
		}

		SessionCreateParams params = SessionCreateParams.builder()
			.setMode(SessionCreateParams.Mode.PAYMENT)
			.setSuccessUrl(frontendUrl + "/checkout/success?sessionId={CHECKOUT_SESSION_ID}")
			.setCancelUrl(frontendUrl + "/checkout/cancel")
			.addAllLineItem(lineItems)
			.setClientReferenceId("order-" + orderResponse.id())
			.putMetadata("orderId", orderResponse.id().toString())
			.build();

		Session session = Session.create(params);

		log.info("Stripe session created: {} for order: {}", session.getId(), orderResponse.id());

		return new CheckoutSessionResponse(
			session.getUrl(),
			session.getId()
		);
	}
}
