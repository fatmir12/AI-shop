
package com.aishop.backend.mcp;

import com.aishop.backend.dto.OrderResponse;
import com.aishop.backend.service.OrderService;

import io.modelcontextprotocol.server.McpSyncServerExchange;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class OrderMcpTools {

    private final OrderService orderService;

    public OrderMcpTools(OrderService orderService) {
        this.orderService = orderService;
    }

    @McpTool(
            name = "getMyOrders",
            description = """
                    Get the order history of the currently
                    authenticated AIShop user.

                    Returns order IDs, statuses, amounts,
                    creation dates and ordered products.

                    All amounts are in BAM (KM).

                    Use this tool when the customer asks
                    about their previous orders or
                    the status of their orders.

                    This tool is read-only.
                    """,
            annotations = @McpTool.McpAnnotations(
                    readOnlyHint = true,
                    destructiveHint = false,
                    idempotentHint = true,
                    openWorldHint = false
            )
    )
    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders(
            McpSyncServerExchange exchange) {

        Object userIdValue = exchange
                .transportContext()
                .get("userId");

        if (!(userIdValue instanceof Long userId)) {
            throw new SecurityException(
                    "Authenticated user is required"
            );
        }

        System.out.println(
                "MCP getMyOrders called for userId=" + userId
        );

        List<OrderResponse> orders = orderService.getMyOrders(userId);

        System.out.println(
                "MCP found orders: " + orders.size()
        );

        return orders;
    }
}
