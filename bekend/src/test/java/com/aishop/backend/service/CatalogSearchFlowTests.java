package com.aishop.backend.service;

import com.aishop.backend.entity.*;
import com.aishop.backend.repository.*;
import com.aishop.backend.mcp.*;
import io.modelcontextprotocol.client.McpSyncClient;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.mcp.SyncMcpToolCallbackProvider;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:catalog;INIT=CREATE SCHEMA IF NOT EXISTS dbo",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
    "spring.datasource.password=", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CatalogSearchFlowTests {
    @Autowired ProductRepository products;
    @Autowired CategoryRepository categories;
    final ObjectMapper mapper = new ObjectMapper();
    Category mice;
    Product cheapest, expensive, budget;
    List<JsonNode> returned;
    JsonNode arguments;

    @BeforeEach void seed() {
        mice = category("Miševi");
        cheapest = product(mice, "Budget mouse", "12.37", 3);
        for (int i = 0; i < 25; i++) product(mice, "Mouse " + i, "100.00", 2);
        budget = product(mice, "Budget maximum", "300.00", 2);
        expensive = product(mice, "Premium mouse", "650.43", 1);
        product(mice, "Sold out cheap", "1.00", 0);
        product(mice, "Sold out premium", "999.00", 0);
        product(category("Laptopi"), "Laptop", "850.73", 2);
        product(category("Tastature"), "Keyboard", "89.91", 2);
        products.flush();
    }
    Category category(String name) {
        var c = new Category(); c.setName(name); return categories.save(c);
    }
    Product product(Category c, String name, String price, int stock) {
        var p = new Product(); p.setCategory(c); p.setName(name);
        p.setPrice(new BigDecimal(price)); p.setStock(stock); return products.save(p);
    }
    ToolCallback callback(String name, Function<String, Object> operation) {
        return new ToolCallback() {
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder().name(name).description(name).inputSchema("{}").build();
            }
            public String call(String args) { return mapper.writeValueAsString(operation.apply(args)); }
        };
    }
    String ask(String question) {
        returned = null;
        var tool = new ProductMcpTools(products);
        ToolCallback search = callback("searchProducts", raw -> {
            arguments = mapper.readTree(raw);
            var a = arguments;
            var result = tool.searchProducts(null,
                a.has("minPrice") ? new BigDecimal(a.path("minPrice").asText()) : null,
                a.has("maxPrice") ? new BigDecimal(a.path("maxPrice").asText()) : null,
                a.has("categoryId") ? a.path("categoryId").asLong() : null,
                a.path("availableOnly").asBoolean(), a.path("sortDirection").asText(), a.path("limit").asInt());
            returned = new ArrayList<>();
            mapper.valueToTree(result).forEach(returned::add);
            return result;
        });
        ToolCallback cats = callback("getCategories", raw -> new CategoryMcpTools(categories).getCategories());
        var provider = mock(SyncMcpToolCallbackProvider.class);
        when(provider.getToolCallbacks()).thenReturn(new ToolCallback[]{search, cats});
        var builder = mock(SyncMcpToolCallbackProvider.Builder.class, RETURNS_SELF);
        when(builder.build()).thenReturn(provider);
        var client = mock(McpClientService.class);
        when(client.withClient(anyString(), anyString(), any())).thenAnswer(inv -> {
            Function<McpSyncClient, String> operation = inv.getArgument(2);
            return operation.apply(mock(McpSyncClient.class));
        });
        var pending = mock(PendingCartActionService.class);
        when(pending.forRequest(anyLong(), anyString())).thenReturn(List.of());
        var model = mock(ChatModel.class);
        try (var factory = mockStatic(SyncMcpToolCallbackProvider.class)) {
            factory.when(SyncMcpToolCallbackProvider::builder).thenReturn(builder);
            var chat = new AiChatService(ChatClient.builder(model), client, pending,
                new CatalogMcpAnswerService(mapper), mock(CartAddMcpService.class), mock(CartModifyMcpService.class));
            String reply = chat.chat(question, "test-token", 1L, List.of()).reply();
            verifyNoInteractions(model);
            assertNotNull(returned, "Query must reach the catalog tool");
            for (var row : returned) assertTrue(reply.contains(row.path("name").asText()));
            return reply;
        }
    }
    void selected(Product expected) {
        assertEquals(1, returned.size());
        assertEquals(expected.getId().longValue(), returned.getFirst().path("id").asLong());
        assertEquals(0, expected.getPrice().compareTo(new BigDecimal(returned.getFirst().path("price").asText())));
    }
    @Test void cheapestAndWordForms() {
        for (String word : List.of("miš", "miševi", "miša")) {
            assertTrue(ask("Koji najjeftiniji " + word + " imate?").contains("12,37 KM")); selected(cheapest);
        }
    }
    @Test void mostExpensiveBeyondFirstTwenty() {
        assertTrue(ask("Koji najskuplji miš imate?").contains("650,43 KM")); selected(expensive);
    }
    @Test void onlyMiceWithinBudget() {
        ask("Koji miš mogu kupiti za 300 KM?");
        assertEquals(20, returned.size());
        for (var row : returned) {
            var p = products.findById(row.path("id").asLong()).orElseThrow();
            assertEquals(mice.getId(), p.getCategory().getId());
            assertTrue(p.getPrice().compareTo(new BigDecimal("300")) <= 0);
            assertTrue(p.getStock() > 0);
        }
    }
    @Test void mostExpensiveWithinBudget() {
        ask("Koji najskuplji miš mogu kupiti za 300 KM?"); selected(budget);
        ask("Koji najskuplji miš imate do 2 000,00 KM?"); selected(expensive);
        ask("Imam 300 KM, koji je najskuplji miš koji mogu kupiti?"); selected(budget);
    }
    @Test void rangeAndDirections() {
        ask("Prikaži miševe od 200 do 400 KM sortirano DESC"); selected(budget);
        assertEquals("DESC", arguments.path("sortDirection").asText());
        ask("Prikaži miševe od 10 do 300 KM sortirano ASC");
        assertEquals(cheapest.getId().longValue(), returned.getFirst().path("id").asLong());
    }
    @Test void lessThanDoesNotBecomeMinimumAndNoMatchesAreHonest() {
        ask("Koje miševe imate za manje od 20 KM?"); selected(cheapest);
        assertFalse(arguments.has("minPrice"));
        assertTrue(ask("Koje miševe imate od 400 do 500 KM?").contains("nemamo dostupnih"));
        assertTrue(returned.isEmpty());
    }
    @Test void toolValidatesSortAndLimitAndKeepsOldDefaults() {
        var tool = new ProductMcpTools(products);
        assertThrows(IllegalArgumentException.class,
            () -> tool.searchProducts(null, null, null, mice.getId(), true, "wrong", 1));
        assertThrows(IllegalArgumentException.class,
            () -> tool.searchProducts(null, null, null, mice.getId(), true, "DESC", 21));
        var result = tool.searchProducts(null, null, null, mice.getId(), true);
        assertEquals(20, result.size());
        assertEquals(cheapest.getId(), result.getFirst().id());
    }
    @Test void otherCategoriesAndDatabasePriceChanges() {
        assertTrue(ask("Koji najjeftiniji laptop imate?").contains("850,73 KM"));
        assertTrue(ask("Koje tastature imate do 100 KM?").contains("89,91 KM"));
        expensive.setPrice(new BigDecimal("7.63")); products.saveAndFlush(expensive);
        assertTrue(ask("Koji najjeftiniji miš imate?").contains("7,63 KM")); selected(expensive);
    }
}
