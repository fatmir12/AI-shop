
package com.aishop.backend.controller;

import com.aishop.backend.dto.AddCartItemRequest;
import com.aishop.backend.dto.UpdateCartItemRequest;
import com.aishop.backend.dto.ShoppingCartResponse;
import com.aishop.backend.service.ShoppingCartService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/cart")
public class ShoppingCartController {

    private final ShoppingCartService cartService;

    public ShoppingCartController(
            ShoppingCartService cartService) {
        this.cartService = cartService;
    }

    // Pregled korpe
    @GetMapping
    public ShoppingCartResponse getCart(
            @AuthenticationPrincipal Jwt jwt) {

        return cartService.getCart(getUserId(jwt));
    }

    // Dodavanje proizvoda u korpu
    @PostMapping("/items")
    public ShoppingCartResponse addItem(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddCartItemRequest request) {

        return cartService.addItem(
                getUserId(jwt),
                request
        );
    }

    // Promjena kolicine proizvoda
    @PutMapping("/items/{itemId}")
    public ShoppingCartResponse updateItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {

        return cartService.updateItem(
                getUserId(jwt),
                itemId,
                request
        );
    }

    // Uklanjanje proizvoda iz korpe
    @DeleteMapping("/items/{itemId}")
    public ShoppingCartResponse removeItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long itemId) {

        return cartService.removeItem(
                getUserId(jwt),
                itemId
        );
    }

    // Praznjenje cijele korpe
    @DeleteMapping
    public ShoppingCartResponse clearCart(
            @AuthenticationPrincipal Jwt jwt) {

        return cartService.clearCart(getUserId(jwt));
    }

    // ID korisnika uzimamo iz JWT tokena
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
