package com.aishop.backend.service;

import com.aishop.backend.entity.Order;
import com.aishop.backend.entity.OrderStatus;
import com.aishop.backend.repository.OrderItemRepository;
import com.aishop.backend.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrderCancellationService {
    private final OrderItemRepository items;
    private final ProductRepository products;
    public OrderCancellationService(OrderItemRepository items, ProductRepository products) {
        this.items=items; this.products=products;
    }
    // Caller must hold the order's pessimistic write lock in this transaction.
    @Transactional(propagation=Propagation.MANDATORY)
    public void restoreAndCancel(Order order) {
        if (order.getStatus()==OrderStatus.CANCELLED) return;
        if (order.getStatus()!=OrderStatus.PENDING && order.getStatus()!=OrderStatus.CONFIRMED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Poslana roba prvo zahtijeva obradu povrata.");
        for (var item:items.findByOrderId(order.getId())) {
            if(products.increaseStock(item.getProduct().getId(), item.getQuantity())!=1)
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Zaliha nije ažurirana; pokušajte ponovo.");
        }
        order.setStatus(OrderStatus.CANCELLED);
    }
}