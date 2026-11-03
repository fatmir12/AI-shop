
package com.aishop.backend.dto;

import com.aishop.backend.service.PendingCartActionService.ActionType;

import jakarta.validation.constraints.NotNull;

public record CartActionRequest(
        @NotNull ActionType type,
        Long productId,
        Long itemId,
        Integer quantity
) {
}
