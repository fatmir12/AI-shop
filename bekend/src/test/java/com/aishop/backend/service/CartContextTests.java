package com.aishop.backend.service;

import com.aishop.backend.dto.AiChatRequest.ChatTurn;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CartContextTests {
    final ObjectMapper mapper = new ObjectMapper();
    final String laptop = "{\"id\":41,\"name\":\"Lenovo ThinkPad\",\"categoryName\":\"Laptopi\",\"stock\":5,\"available\":true}";
    final String second = "{\"id\":42,\"name\":\"Dell XPS\",\"categoryName\":\"Laptopi\",\"stock\":5,\"available\":true}";
    ToolCallback tool(String name, String result) {
        ToolCallback t = mock(ToolCallback.class);
        when(t.getToolDefinition()).thenReturn(ToolDefinition.builder().name(name).description(name).inputSchema("{}").build());
        when(t.call(anyString())).thenReturn(result);
        return t;
    }
    @Test void oneLaptopByRealCategoryAndStock() {
        var search = tool("searchProducts", "[" + laptop + "]");
        var add = tool("addToCart", "{}");
        var service = new CartAddMcpService(mapper);
        service.prepare("dodaj taj laptop", List.of(), new ToolCallback[]{search, add}, 1L, "r");
        verify(add).call("{\"productId\":41,\"quantity\":1}");
        clearInvocations(add);
        service.prepare("dodaj 6 komada tog laptopa", List.of(), new ToolCallback[]{search, add}, 1L, "s");
        verify(add, never()).call(anyString());
    }
    @Test void ambiguousAndMissingProductsNeverPrepare() {
        var search = tool("searchProducts", "[" + laptop + "," + second + "]");
        var add = tool("addToCart", "{}");
        var service = new CartAddMcpService(mapper);
        for (String message : List.of("dodaj laptop", "dodaj productId 999"))
            service.prepare(message, List.of(), new ToolCallback[]{search, add}, 1L, "r");
        verify(add, never()).call(anyString());
    }
    @Test void historyIsRequestLocalAndFirstUsesDisplayedOrder() {
        var products = ProductReferenceResolver.records(mapper, "[" + laptop + "," + second + "]");
        var alice = List.of(new ChatTurn("assistant", "Dell XPS, zatim Lenovo ThinkPad"));
        assertEquals(42, ProductReferenceResolver.resolve(products, "dodaj taj prvi", alice).getFirst().path("id").asInt());
        assertEquals(2, ProductReferenceResolver.resolve(products, "dodaj ga", List.of()).size());
        assertEquals(41, ProductReferenceResolver.resolve(products, "dodaj ga", List.of(new ChatTurn("assistant", "Lenovo ThinkPad"))).getFirst().path("id").asInt());
    }
    void modify(String command, String items, boolean expected, String args) {
        var cart = tool("getMyCart", "{\"items\":" + items + "}");
        var search = tool("searchProducts", "[" + laptop + "," + second + "]");
        String name = command.contains("ukloni") ? "removeFromCart" : "updateCartQuantity";
        var mutation = tool(name, "{}");
        new CartModifyMcpService(mapper).prepare(command, List.of(), new ToolCallback[]{cart, search, mutation},
                AiToolPolicy.classify(command), "r");
        verify(cart).call("{}");
        if (expected) verify(mutation).call(args);
        else verify(mutation, never()).call(anyString());
    }
    final String item = "{\"id\":91,\"productId\":41,\"productName\":\"Lenovo ThinkPad\",\"quantity\":1}";
    @Test void absoluteAndRelativeUseCartItemId() {
        for (String command : List.of("postavi količinu na 3", "povećaj količinu laptopa za 2"))
            modify(command, "[" + item + "]", true, "{\"itemId\":91,\"quantity\":3}");
        modify("dodaj još jedan komad tog laptopa", "[" + item + "]", true, "{\"itemId\":91,\"quantity\":2}");
    }
    @Test void removeUniqueButNeverAmbiguous() {
        modify("ukloni laptop", "[" + item + "]", true, "{\"itemId\":91}");
        modify("ukloni laptop", "[" + item + ",{\"id\":92,\"productId\":42,\"productName\":\"Dell XPS\",\"quantity\":1}]", false, "");
    }
    @Test void incompleteAndExcessStockDoNotPrepare() {
        modify("povećaj količinu", "[" + item + "]", false, "");
        modify("postavi količinu na 6", "[" + item + "]", false, "");
    }
    @Test void negationAndInformationNeverExposeWrites() {
        for (String command : List.of("Nemoj dodati laptop", "Nemoj mi ga ubaciti u korpu", "Kako mogu dodati laptop?")) {
            var intent = AiToolPolicy.classify(command);
            assertFalse(AiToolPolicy.isMutation(intent));
            for (String tool : List.of("addToCart", "updateCartQuantity", "removeFromCart")) assertFalse(AiToolPolicy.permitted(tool, intent));
        }
    }
}
