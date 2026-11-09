package com.aishop.backend.dto;

import jakarta.validation.constraints.*;

public record ShippingDetails(
        @NotBlank @Size(max=100) String firstName,
        @NotBlank @Size(max=100) String lastName,
        @NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(min=5, max=200) String address,
        @NotBlank @Size(max=100) String city,
        @NotBlank @Pattern(regexp="[0-9]{5}") String postalCode,
        @NotBlank @Size(min=6, max=30)
        @Pattern(regexp="^(?=(?:[^0-9]*[0-9]){6})\\+?[0-9 ()/.-]{6,30}$") String phone
) {
    public ShippingDetails {
        firstName=clean(firstName); lastName=clean(lastName); email=clean(email);
        address=clean(address); city=clean(city); postalCode=clean(postalCode); phone=clean(phone);
    }
    private static String clean(String value) { return value == null ? null : value.strip(); }
}