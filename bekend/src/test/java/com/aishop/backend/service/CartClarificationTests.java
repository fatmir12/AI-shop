package com.aishop.backend.service;

import com.aishop.backend.dto.AiChatRequest.ChatTurn;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.concurrent.CompletionException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CartClarificationTests {
    final List<ChatTurn> history = List.of(
            new ChatTurn("user", "Povećaj količinu laptopa u korpi"),
            new ChatTurn("assistant", AiToolPolicy.QUANTITY_QUESTION));
    final ObjectMapper mapper = new ObjectMapper();

    ToolCallback tool(String name, String result) {
        ToolCallback tool = mock(ToolCallback.class);
        when(tool.getToolDefinition()).thenReturn(ToolDefinition.builder().name(name)
                .description(name).inputSchema("{}").build());
        when(tool.call(anyString())).thenReturn(result);
        return tool;
    }

    @Test void quantityRepliesOnlyContinueExpectedSlot() {
        for (String reply : List.of("na 3", "3 komada", "za 2", "još jedan", "smanji za jedan")) {
            var route = AiToolPolicy.route(reply, history);
            assertEquals(AiToolPolicy.Intent.CART_UPDATE, route.intent(), reply);
            assertTrue(route.continuation());
            assertTrue(AiToolPolicy.permitted("getMyCart", route.intent()));
            assertTrue(AiToolPolicy.permitted("updateCartQuantity", route.intent()));
            assertFalse(AiToolPolicy.permitted("addToCart", route.intent()));
            assertFalse(AiToolPolicy.permitted("removeFromCart", route.intent()));
            assertFalse(AiToolPolicy.isMutation(AiToolPolicy.route(reply, List.of()).intent()), reply);
        }
    }

    @Test void freshCartItemAndStockAreUsedForEveryContinuation() {
        var cart = tool("getMyCart", "{\"items\":[{\"id\":91,\"productId\":41,\"productName\":\"ThinkPad\",\"quantity\":2}]}");
        var search = tool("searchProducts", "[{\"id\":41,\"name\":\"ThinkPad\",\"categoryName\":\"Laptopi\",\"available\":true,\"stock\":5}]");
        var update = tool("updateCartQuantity", "{}");
        var service = new CartModifyMcpService(mapper);
        String[] replies = {"na 3", "3 komada", "za 2", "još jedan", "smanji za jedan"};
        int[] totals = {3, 3, 4, 3, 1};
        for (int i = 0; i < replies.length; i++) {
            clearInvocations(cart, search, update);
            var route = AiToolPolicy.route(replies[i], history);
            service.prepare(route.command(), history, new ToolCallback[]{cart, search, update}, route.intent(), "r" + i);
            verify(cart).call("{}");
            verify(search).call("{}");
            verify(update).call("{\"itemId\":91,\"quantity\":" + totals[i] + "}");
        }
        when(search.call(anyString())).thenReturn("[{\"id\":41,\"name\":\"ThinkPad\",\"categoryName\":\"Laptopi\",\"available\":true,\"stock\":2}]");
        clearInvocations(update);
        var route = AiToolPolicy.route("na 3", history);
        service.prepare(route.command(), history, new ToolCallback[]{cart, search, update}, route.intent(), "stock");
        verify(update, never()).call(anyString());
    }

    @Test void topicChangeCancellationAndCompletedActionsDoNotResume() {
        assertEquals(AiToolPolicy.Intent.CATALOG, AiToolPolicy.route("Koje telefone imate?", history).intent());
        assertFalse(AiToolPolicy.route("Nemoj, na 3", history).continuation());
        var changedTopic = List.of(history.getFirst(), history.getLast(),
                new ChatTurn("user", "Koje telefone imate?"), new ChatTurn("assistant", "Imamo telefon."));
        assertFalse(AiToolPolicy.isMutation(AiToolPolicy.route("na 3", changedTopic).intent()));
        var completed = List.of(history.getFirst(), new ChatTurn("assistant", "Potrebna je potvrda radnje."));
        assertFalse(AiToolPolicy.isMutation(AiToolPolicy.route("na 3", completed).intent()));
        var wrongSlot = List.of(history.getFirst(), new ChatTurn("assistant", "Koji proizvod želite?"));
        assertFalse(AiToolPolicy.isMutation(AiToolPolicy.route("na 3", wrongSlot).intent()));
    }

    @Test void historyCannotSupplyAnotherUsersCartItemOrBypassFreshCartRead() {
        var emptyCart = tool("getMyCart", "{\"items\":[]}");
        var update = tool("updateCartQuantity", "{}");
        var route = AiToolPolicy.route("na 3", history);
        new CartModifyMcpService(mapper).prepare(route.command(), history,
                new ToolCallback[]{emptyCart, update}, route.intent(), "other-user");
        verify(emptyCart).call("{}");
        verify(update, never()).call(anyString());
    }

    @Test void priorDecreaseDirectionIsPreserved() {
        var decrease = List.of(new ChatTurn("user", "Smanji količinu laptopa u korpi"), history.getLast());
        var route = AiToolPolicy.route("za 2", decrease);
        assertEquals(1, CartModifyMcpService.requestedQuantity(route.command(), 3));
    }

    @Test void noSharedStateBetweenUsersOrConversations() {
        // Each call receives only that conversation's history; there is no user-global pending slot.
        assertTrue(AiToolPolicy.route("na 3", history).continuation());
        assertFalse(AiToolPolicy.route("na 3", List.of()).continuation());
        assertFalse(AiToolPolicy.route("na 3", null).continuation());
    }

    @Test void unavailableModelToolIsHandledWithoutCallingMutation() {
        var write = tool("updateCartQuantity", "{}");
        var intent = AiToolPolicy.route("na 3", List.of()).intent();
        assertFalse(AiToolPolicy.permitted("getMyCart", intent));
        assertFalse(AiToolPolicy.permitted("updateCartQuantity", intent));
        String response = assertDoesNotThrow(() -> AiChatService.modelReply(() -> {
            throw new CompletionException(new IllegalStateException("No ToolCallback found for tool name: getMyCart"));
        }, intent, "test"));
        assertFalse(response.contains("getMyCart"));
        assertFalse(response.contains("IllegalStateException"));
        verify(write, never()).call(anyString());
    }
}
