
package com.aishop.backend.dto;

import java.math.BigDecimal;
import java.util.List;

public record ShoppingCartResponse(

        Long cartId,
        List<CartItemResponse> items,
        BigDecimal totalPrice,
        Integer totalItems

) {
}
