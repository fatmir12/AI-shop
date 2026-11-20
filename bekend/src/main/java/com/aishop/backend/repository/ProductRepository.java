
package com.aishop.backend.repository;

import com.aishop.backend.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends
        JpaRepository<Product, Long>,
        JpaSpecificationExecutor<Product> {

    List<Product> findByCategoryId(Long categoryId);



    @Modifying
    @Query("""
    UPDATE Product p
    SET p.stock = p.stock - :quantity
    WHERE p.id = :productId
      AND p.stock >= :quantity
    """)
    int decreaseStock(
            @Param("productId") Long productId,
            @Param("quantity") int quantity
    );

    @Modifying
    @Query("""
    UPDATE Product p
    SET p.stock = p.stock + :quantity
    WHERE p.id = :productId
    """)
    int increaseStock(
            @Param("productId") Long productId,
            @Param("quantity") int quantity
    );


}
