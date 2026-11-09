package com.aishop.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ShippingAddress {
    @Column(name="shipping_first_name", length=100) private String firstName;
    @Column(name="shipping_last_name", length=100) private String lastName;
    @Column(name="shipping_email", length=254) private String email;
    @Column(name="shipping_address", length=200) private String address;
    @Column(name="shipping_city", length=100) private String city;
    @Column(name="shipping_postal_code", length=5) private String postalCode;
    @Column(name="shipping_phone", length=30) private String phone;
}