
package com.aishop.backend.repository;

import com.aishop.backend.entity.ShoppingCart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShoppingCartRepository
        extends JpaRepository<ShoppingCart, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select cart from ShoppingCart cart where cart.user.id = :userId")
    Optional<ShoppingCart> findForCheckout(@org.springframework.data.repository.query.Param("userId") Long userId);

    Optional<ShoppingCart> findByUserId(Long userId);
}
