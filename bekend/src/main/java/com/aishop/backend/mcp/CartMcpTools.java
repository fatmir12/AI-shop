
package com.aishop.backend.mcp;

import com.aishop.backend.entity.CartItem;
import com.aishop.backend.entity.Product;
import com.aishop.backend.entity.ShoppingCart;

import com.aishop.backend.repository.CartItemRepository;
import com.aishop.backend.repository.ShoppingCartRepository;

import io.modelcontextprotocol.server.McpSyncServerExchange;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
public class CartMcpTools {

    private final ShoppingCartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    public CartMcpTools(
            ShoppingCartRepository cartRepository,
            CartItemRepository cartItemRepository) {

        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
    }

    @McpTool(
            name = "getMyCart",
            description = """
                    Get the shopping cart belonging to the
                    currently authenticated AIShop user.

                    Returns cart items, product names,
                    quantities, prices and total amount.

                    All prices are in BAM (KM).

                    Use this tool when a customer asks
                    what is in their shopping cart.

                    This tool does not modify the cart.
                    """,
            annotations = @McpTool.McpAnnotations(
                    readOnlyHint = true,
                    destructiveHint = false,
                    idempotentHint = true,
                    openWorldHint = false
            )
    )
    @Transactional(readOnly = true)
    public CartResult getMyCart(
            McpSyncServerExchange exchange) {

        // Identitet dolazi iz validiranog JWT-a
        // u MCP transport contextu
        Object userIdValue = exchange
                .transportContext()
                .get("userId");

        if (!(userIdValue instanceof Long userId)) {
            throw new SecurityException(
                    "Authenticated user is required"
            );
        }

        ShoppingCart cart = cartRepository
                .findByUserId(userId)
                .orElse(null);

        if (cart == null) {
            return new CartResult(
                    null,
                    List.of(),
                    BigDecimal.ZERO,
                    0,
                    "BAM"
            );
        }

        List<CartItem> cartItems =
                cartItemRepository.findByCartId(cart.getId());

        List<CartItemResult> items = cartItems.stream()
                .map(this::toCartItemResult)
                .toList();

        BigDecimal totalPrice = items.stream()
                .map(CartItemResult::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalItems = items.stream()
                .mapToInt(CartItemResult::quantity)
                .sum();

        return new CartResult(
                cart.getId(),
                items,
                totalPrice,
                totalItems,
                "BAM"
        );
    }

    private CartItemResult toCartItemResult(
            CartItem cartItem) {

        Product product = cartItem.getProduct();

        BigDecimal subtotal = product.getPrice()
                .multiply(
                        BigDecimal.valueOf(
                                cartItem.getQuantity()
                        )
                );

        return new CartItemResult(
                cartItem.getId(),
                product.getId(),
                product.getName(),
                product.getPrice(),
                cartItem.getQuantity(),
                subtotal
        );
    }

    public record CartItemResult(
            Long id,
            Long productId,
            String productName,
            BigDecimal unitPrice,
            Integer quantity,
            BigDecimal subtotal
    ) {
    }

    public record CartResult(
            Long cartId,
            List<CartItemResult> items,
            BigDecimal totalPrice,
            Integer totalItems,
            String currency
    ) {
    }
}
