
package com.aishop.backend.mcp;

import com.aishop.backend.service.PendingCartActionService;
import com.aishop.backend.service.PendingCartActionService.ActionType;

import io.modelcontextprotocol.server.McpSyncServerExchange;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.stereotype.Component;

@Component
public class CartActionMcpTools {

    private final PendingCartActionService pendingActions;

    public CartActionMcpTools(
            PendingCartActionService pendingActions) {
        this.pendingActions = pendingActions;

        System.out.println("CART ACTION MCP TOOLS BEAN CREATED");
    }

    @McpTool(
            name = "addToCart",
            description = """
                    Prepare adding a product to the authenticated
                    user's shopping cart.

                    Requires productId and quantity.
                    This only creates a pending action.
                    No cart changes occur until the user
                    confirms through the REST API.
                    """
    )
    public ActionProposal addToCart(
            McpSyncServerExchange exchange,

            @McpToolParam(
                    description = "Product ID to add"
            )
            Long productId,

            @McpToolParam(
                    description = "Number of units to add"
            )
            Integer quantity) {

        var action = pendingActions.create(
                getUserId(exchange),
                ActionType.ADD,
                productId,
                null,
                quantity,
                (String) exchange.transportContext().get("chatRequestId")
        );

        return toProposal(action);
    }

    @McpTool(
            name = "removeFromCart",
            description = """
                    Prepare removing an item from the user's cart.

                    Requires cart item ID, NOT product ID.
                    First use getMyCart to identify the item.

                    This operation requires separate confirmation.
                    """
    )
    public ActionProposal removeFromCart(
            McpSyncServerExchange exchange,

            @McpToolParam(
                    description = "Cart item ID, not product ID"
            )
            Long itemId) {

        var action = pendingActions.create(
                getUserId(exchange),
                ActionType.REMOVE,
                null,
                itemId,
                null,
                (String) exchange.transportContext().get("chatRequestId")
        );

        return toProposal(action);
    }

    @McpTool(
            name = "updateCartQuantity",
            description = """
                    Prepare changing the quantity of a cart item.

                    Requires cart item ID and NEW total quantity.
                    First use getMyCart to identify the item.

                    The quantity is the new total, not an
                    amount to add.

                    Requires separate user confirmation.
                    """
    )
    public ActionProposal updateCartQuantity(
            McpSyncServerExchange exchange,

            @McpToolParam(
                    description = "Cart item ID"
            )
            Long itemId,

            @McpToolParam(
                    description = "New total quantity"
            )
            Integer quantity) {

        var action = pendingActions.create(
                getUserId(exchange),
                ActionType.UPDATE,
                null,
                itemId,
                quantity,
                (String) exchange.transportContext().get("chatRequestId")
        );

        return toProposal(action);
    }

    private Long getUserId(McpSyncServerExchange exchange) {

        Object value = exchange.transportContext().get("userId");

        if (!(value instanceof Long userId)) {
            throw new SecurityException(
                    "Authenticated user is required"
            );
        }

        return userId;
    }

    private ActionProposal toProposal(
            PendingCartActionService.PendingAction action) {

        return new ActionProposal(
                action.actionId(),
                action.type().name(),
                action.productId(),
                action.itemId(),
                action.quantity(),
                action.expiresAt().toString(),
                "PENDING_CONFIRMATION",
                "Action not executed. User confirmation required."
        );
    }

    public record ActionProposal(
            String actionId,
            String type,
            Long productId,
            Long itemId,
            Integer quantity,
            String expiresAt,
            String status,
            String message
    ) {
    }
}
