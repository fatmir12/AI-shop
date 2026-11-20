
package com.aishop.backend.service;

import com.aishop.backend.dto.*;
import com.aishop.backend.entity.*;
import com.aishop.backend.repository.*;

import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShoppingCartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ShoppingCartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            UserRepository userRepository,
            EntityManager entityManager) {

        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    // Kreiranje narudzbe iz korpe
    @Transactional
    public OrderResponse createOrder(Long userId, ShippingDetails shipping) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        ShoppingCart cart = cartRepository.findForCheckout(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Shopping cart is empty"
                ));

        List<CartItem> cartItems =
                cartItemRepository.findByCartId(cart.getId());

        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Shopping cart is empty"
            );
        }

        Order order = new Order();
        order.setUser(user);
        order.setShipping(new ShippingAddress(shipping.firstName(), shipping.lastName(), shipping.email(),
                shipping.address(), shipping.city(), shipping.postalCode(), shipping.phone()));
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(BigDecimal.ZERO);

        order = orderRepository.saveAndFlush(order);

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {

            Product product = cartItem.getProduct();
            int quantity = cartItem.getQuantity();

            if (quantity <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Invalid product quantity"
                );
            }

            int updatedRows = productRepository.decreaseStock(
                    product.getId(),
                    quantity
            );

            if (updatedRows != 1) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Insufficient stock for product: "
                                + product.getName()
                );
            }

            BigDecimal unitPrice = product.getPrice();

            BigDecimal subtotal = unitPrice.multiply(
                    BigDecimal.valueOf(quantity)
            );

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setProductName(product.getName());
            orderItem.setQuantity(quantity);
            orderItem.setUnitPrice(unitPrice);
            orderItem.setSubtotal(subtotal);

            orderItemRepository.save(orderItem);

            totalAmount = totalAmount.add(subtotal);
        }

        order.setTotalAmount(totalAmount);
        orderRepository.save(order);

        // Praznjenje korpe nakon narudzbe
        cartItemRepository.deleteAll(cartItems);
        cartItemRepository.flush();

        orderItemRepository.flush();

        // Ucitavanje createdAt iz SQL Servera
        entityManager.flush();
        entityManager.refresh(order);

        return buildResponse(order);
    }

    // Historija narudzbi trenutno prijavljenog korisnika
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(Long userId) {

        return orderRepository
                .findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::buildResponse)
                .toList();
    }

    // Detalji jedne korisnikove narudzbe
    @Transactional(readOnly = true)
    public OrderResponse getMyOrder(
            Long userId,
            Long orderId) {

        Order order = orderRepository
                .findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found"
                ));

        return buildResponse(order);
    }

    // Pregled svih narudzbi - ADMIN
    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders() {

        return orderRepository.findAll()
                .stream()
                .map(this::buildResponse)
                .toList();
    }

    // Promjena statusa - ADMIN
    @Transactional
    public OrderResponse updateOrderStatus(
            Long orderId,
            UpdateOrderStatusRequest request) {

        Order order = orderRepository.findForPayment(orderId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Order not found"
                ));

        if ("PENDING".equals(order.getRefundStatus()) || "REFUNDED".equals(order.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Narudžba ima povrat novca i ne može se dalje obrađivati.");
        }
        OrderStatus currentStatus = order.getStatus();
        OrderStatus newStatus = request.status();

        if (!isValidTransition(currentStatus, newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid order status transition"
            );
        }

        if (newStatus == OrderStatus.CANCELLED && order.getStripeSessionId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Narudžba ima pokrenuto plaćanje. Prvo zatvorite Stripe sesiju ili obradite povrat novca.");
        }

        // Vracanje zaliha ako je narudzba otkazana
        if (newStatus == OrderStatus.CANCELLED) {

            List<OrderItem> items =
                    orderItemRepository.findByOrderId(orderId);

            for (OrderItem item : items) {

                int updatedRows = productRepository.increaseStock(
                        item.getProduct().getId(),
                        item.getQuantity()
                );

                if (updatedRows != 1) {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Unable to restore product stock"
                    );
                }
            }
        }

        order.setStatus(newStatus);
        orderRepository.saveAndFlush(order);

        return buildResponse(order);
    }

    // Dozvoljene promjene statusa
    private boolean isValidTransition(
            OrderStatus current,
            OrderStatus next) {

        return switch (current) {

            case PENDING ->
                    next == OrderStatus.CONFIRMED
                            || next == OrderStatus.CANCELLED;

            case CONFIRMED ->
                    next == OrderStatus.SHIPPED
                            || next == OrderStatus.CANCELLED;

            case SHIPPED ->
                    next == OrderStatus.DELIVERED;

            case DELIVERED, CANCELLED -> false;
        };
    }

    // Pretvaranje Order entiteta u DTO
    private OrderResponse buildResponse(Order order) {

        List<OrderItemResponse> items =
                orderItemRepository.findByOrderId(order.getId())
                        .stream()
                        .map(this::toItemResponse)
                        .toList();

        return new OrderResponse(
                order.getId(),
                order.getUser().getId(),
                order.getStatus().name(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                items,
                order.getPaymentStatus(),
                order.getRefundStatus(),
                order.getShipping() == null ? null : new ShippingDetails(
                        order.getShipping().getFirstName(), order.getShipping().getLastName(),
                        order.getShipping().getEmail(), order.getShipping().getAddress(),
                        order.getShipping().getCity(), order.getShipping().getPostalCode(), order.getShipping().getPhone())
        );
    }

    // Pretvaranje OrderItem entiteta u DTO
    private OrderItemResponse toItemResponse(
            OrderItem item) {

        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProductName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal()
        );
    }
}
