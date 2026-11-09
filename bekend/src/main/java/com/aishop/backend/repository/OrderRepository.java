
package com.aishop.backend.repository;

import com.aishop.backend.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository
        extends JpaRepository<Order, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select o from Order o where o.id = :id")
    Optional<Order> findForPayment(@org.springframework.data.repository.query.Param("id") Long id);

    Optional<Order> findByStripeSessionId(String stripeSessionId);

    List<Order> findByUserIdOrderByCreatedAtDesc(
            Long userId
    );

    Optional<Order> findByIdAndUserId(
            Long orderId,
            Long userId
    );
}
