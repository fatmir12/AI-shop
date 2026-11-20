package com.aishop.backend.dto;
public record PaymentStatusResponse(Long orderId, String paymentStatus, String checkoutStatus) {}