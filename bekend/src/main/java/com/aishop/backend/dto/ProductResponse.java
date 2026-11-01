
package com.aishop.backend.dto;

import java.math.BigDecimal;

public record ProductResponse(

        Long id,
        Long categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        Integer stock,
        String imageUrl

) {
}
