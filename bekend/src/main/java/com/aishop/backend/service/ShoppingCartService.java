
package com.aishop.backend.service;

import com.aishop.backend.dto.*;
import com.aishop.backend.entity.*;
import com.aishop.backend.repository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class ShoppingCartService {

    private final ShoppingCartRepository cartRepository;
    private final CartItemRepository itemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public ShoppingCartService(
            ShoppingCartRepository cartRepository,
            CartItemRepository itemRepository,
            ProductRepository productRepository,
            UserRepository userRepository) {

        this.cartRepository = cartRepository;
        this.itemRepository = itemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    // 1. Dohvatanje korpe
    @Transactional
    public ShoppingCartResponse getCart(Long userId) {

        ShoppingCart cart = getOrCreateCart(userId);

        return buildResponse(cart);
    }

    // 2. Dodavanje proizvoda
    @Transactional
    public ShoppingCartResponse addItem(
            Long userId,
            AddCartItemRequest request) {

        ShoppingCart cart = getOrCreateCart(userId);

        Product product = productRepository
                .findById(request.productId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product not found"
                ));

        CartItem item = itemRepository
                .findByCartIdAndProductId(
                        cart.getId(),
                        product.getId()
                )
                .orElse(null);

        int existingQuantity =
                item == null ? 0 : item.getQuantity();

        long newQuantity =
                (long) existingQuantity + request.quantity();

        if (newQuantity > Integer.MAX_VALUE ||
                newQuantity > product.getStock()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Insufficient product stock"
            );
        }

        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(product);
        }

        item.setQuantity((int) newQuantity);

        itemRepository.save(item);

        updateCartTimestamp(cart);

        return buildResponse(cart);
    }

    // 3. Promjena kolicine
    @Transactional
    public ShoppingCartResponse updateItem(
            Long userId,
            Long itemId,
            UpdateCartItemRequest request) {

        ShoppingCart cart = getExistingCart(userId);

        CartItem item = itemRepository
                .findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Cart item not found"
                ));

        Product product = item.getProduct();

        if (request.quantity() > product.getStock()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Insufficient product stock"
            );
        }

        item.setQuantity(request.quantity());

        itemRepository.save(item);

        updateCartTimestamp(cart);

        return buildResponse(cart);
    }

    // 4. Uklanjanje proizvoda
    @Transactional
    public ShoppingCartResponse removeItem(
            Long userId,
            Long itemId) {

        ShoppingCart cart = getExistingCart(userId);

        CartItem item = itemRepository
                .findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Cart item not found"
                ));

        itemRepository.delete(item);
        itemRepository.flush();

        updateCartTimestamp(cart);

        return buildResponse(cart);
    }

    // 5. Praznjenje korpe
    @Transactional
    public ShoppingCartResponse clearCart(Long userId) {

        ShoppingCart cart = getOrCreateCart(userId);

        List<CartItem> items =
                itemRepository.findByCartId(cart.getId());

        itemRepository.deleteAll(items);
        itemRepository.flush();

        updateCartTimestamp(cart);

        return buildResponse(cart);
    }

    // Pomocna metoda: pronalazi ili kreira korpu
    private ShoppingCart getOrCreateCart(Long userId) {

        return cartRepository.findByUserId(userId)
                .orElseGet(() -> {

                    User user = userRepository.findById(userId)
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "User not found"
                                    ));

                    ShoppingCart cart = new ShoppingCart();
                    cart.setUser(user);
                    cart.setUpdatedAt(nowUtc());

                    return cartRepository.saveAndFlush(cart);
                });
    }

    // Pomocna metoda: postojeca korpa
    private ShoppingCart getExistingCart(Long userId) {

        return cartRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Shopping cart not found"
                        ));
    }

    // Azuriranje vremena posljednje izmjene
    private void updateCartTimestamp(ShoppingCart cart) {

        cart.setUpdatedAt(nowUtc());
        cartRepository.save(cart);
    }

    // Pretvaranje entiteta u DTO odgovor
    private ShoppingCartResponse buildResponse(
            ShoppingCart cart) {

        List<CartItem> items =
                itemRepository.findByCartId(cart.getId());

        List<CartItemResponse> itemResponses =
                items.stream()
                        .map(this::toItemResponse)
                        .toList();

        BigDecimal totalPrice = itemResponses.stream()
                .map(CartItemResponse::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalItems = items.stream()
                .mapToInt(CartItem::getQuantity)
                .sum();

        return new ShoppingCartResponse(
                cart.getId(),
                itemResponses,
                totalPrice,
                totalItems
        );
    }

    // Pretvaranje jedne stavke u DTO
    private CartItemResponse toItemResponse(CartItem item) {

        Product product = item.getProduct();

        BigDecimal subtotal = product.getPrice()
                .multiply(
                        BigDecimal.valueOf(item.getQuantity())
                );

        return new CartItemResponse(
                item.getId(),
                product.getId(),
                product.getName(),
                product.getPrice(),
                item.getQuantity(),
                subtotal
        );
    }

    private LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
