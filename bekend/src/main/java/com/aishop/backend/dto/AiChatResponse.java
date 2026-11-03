
package com.aishop.backend.dto;

public record AiChatResponse(
        String reply,
        PendingActionResponse pendingAction
) {

    public AiChatResponse(String reply) {
        this(reply, null);
    }

    public record PendingActionResponse(
            String actionId,
            String type,
            Long productId,
            Long itemId,
            Integer quantity,
            String expiresAt,
            String status
    ) {
    }
}
