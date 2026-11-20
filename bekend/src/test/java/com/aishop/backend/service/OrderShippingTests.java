package com.aishop.backend.service;

import com.aishop.backend.dto.ShippingDetails;
import com.aishop.backend.entity.*;
import com.aishop.backend.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderShippingTests {
    @Test void deliverySnapshotIsStoredWithOrderAndSurvivesProfileChanges() {
        var orders = mock(OrderRepository.class); var items = mock(OrderItemRepository.class);
        var carts = mock(ShoppingCartRepository.class); var cartItems = mock(CartItemRepository.class);
        var products = mock(ProductRepository.class); var users = mock(UserRepository.class);
        var em = mock(EntityManager.class);
        var service = new OrderService(orders, items, carts, cartItems, products, users, em);
        User user = new User(); user.setId(7L); user.setFirstName("Profil");
        ShoppingCart cart = new ShoppingCart(); cart.setId(10L);
        Product product = new Product(); product.setId(40L); product.setName("Laptop"); product.setPrice(new BigDecimal("100.00"));
        CartItem cartItem = new CartItem(); cartItem.setProduct(product); cartItem.setQuantity(2);
        var savedItems = new ArrayList<OrderItem>(); var savedOrders = new ArrayList<Order>();
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(carts.findForCheckout(7L)).thenReturn(Optional.of(cart));
        when(cartItems.findByCartId(10L)).thenReturn(java.util.List.of(cartItem));
        when(products.decreaseStock(40L, 2)).thenReturn(1);
        when(orders.saveAndFlush(any())).thenAnswer(call -> { Order o = call.getArgument(0); o.setId(99L); savedOrders.add(o); return o; });
        when(items.save(any())).thenAnswer(call -> { OrderItem i = call.getArgument(0); i.setId(1L); savedItems.add(i); return i; });
        when(items.findByOrderId(99L)).thenReturn(savedItems);
        var shipping = new ShippingDetails("Primalac", "Kupac", "test@example.test", "Testna ulica 12", "Sarajevo", "71000", "+38761123456");
        var response = service.createOrder(7L, shipping);
        assertEquals(shipping, response.shipping()); assertEquals(new BigDecimal("200.00"), response.totalAmount());
        Order saved = savedOrders.getFirst(); assertEquals("Testna ulica 12", saved.getShipping().getAddress());
        user.setFirstName("Promijenjen profil");
        when(orders.findByIdAndUserId(99L, 7L)).thenReturn(Optional.of(saved));
        assertEquals("Primalac", service.getMyOrder(7L, 99L).shipping().firstName());
        saved.setShipping(null);
        assertNull(service.getMyOrder(7L, 99L).shipping()); // Legacy orders remain readable.
    }
}