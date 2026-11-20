package com.aishop.backend.dto;

import java.util.List;

public record AiChatResponse(String reply, PendingActionResponse pendingAction,
                             List<PendingActionResponse> pendingActions) {
    public AiChatResponse(String reply) { this(reply, null, List.of()); }
    public AiChatResponse(String reply, PendingActionResponse action) {
        this(reply, action, action == null ? List.of() : List.of(action));
    }
    public record PendingActionResponse(String actionId, String type, Long productId,
                                        Long itemId, Integer quantity, String expiresAt, String status) {}
}
