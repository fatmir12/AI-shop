
package com.aishop.backend.controller;

import com.aishop.backend.dto.OrderResponse;
import com.aishop.backend.dto.ShippingDetails;
import com.aishop.backend.dto.UpdateOrderStatusRequest;
import com.aishop.backend.service.OrderService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Kreiranje narudzbe iz korpe
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ShippingDetails shipping) {

        return orderService.createOrder(getUserId(jwt), shipping);
    }

    // Historija mojih narudzbi
    @GetMapping("/my")
    public List<OrderResponse> getMyOrders(
            @AuthenticationPrincipal Jwt jwt) {

        return orderService.getMyOrders(getUserId(jwt));
    }

    // Detalji moje narudzbe
    @GetMapping("/my/{orderId}")
    public OrderResponse getMyOrder(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long orderId) {

        return orderService.getMyOrder(
                getUserId(jwt),
                orderId
        );
    }

    // Pregled svih narudzbi - ADMIN
    @GetMapping
    public List<OrderResponse> getAllOrders() {

        return orderService.getAllOrders();
    }

    // Promjena statusa narudzbe - ADMIN
    @PutMapping("/{orderId}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody
            UpdateOrderStatusRequest request) {

        return orderService.updateOrderStatus(
                orderId,
                request
        );
    }

    private Long getUserId(Jwt jwt) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        try {
            return Long.valueOf(jwt.getSubject());

        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid token subject"
            );
        }
    }
}
