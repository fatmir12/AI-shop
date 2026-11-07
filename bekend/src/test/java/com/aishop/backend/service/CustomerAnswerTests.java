package com.aishop.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class CustomerAnswerTests {
    ToolCallback tool(String name, String result) {
        return new ToolCallback() {
            public ToolDefinition getToolDefinition() {
                return ToolDefinition.builder().name(name).description(name).inputSchema("{}").build();
            }
            public String call(String args) { return result; }
        };
    }
    String ask(String question, String name, String price) {
        var mapper = new ObjectMapper();
        var row = mapper.createObjectNode().put("id", 46).put("name", name).put("price", price);
        return new CatalogMcpAnswerService(mapper).tryAnswer(question, new ToolCallback[]{
                tool("getCategories", "[{\"id\":1,\"name\":\"Miševi\"},{\"id\":2,\"name\":\"Laptopi\"},{\"id\":3,\"name\":\"Tastature\"}]"),
                tool("searchProducts", "{\"structuredContent\":{\"products\":[" + row + "]}}")});
    }
    @Test void cheapestMouseUsesActualNameAndPriceWithoutId() {
        assertEquals("Najpovoljniji miš u našoj ponudi je Logitech M90, po cijeni od 19,00 KM.",
                ask("Koji najjeftiniji miš imate?", "Logitech M90", "19.00"));
    }
    @Test void expensiveLaptopKeepsModelNumbersAndSpecifications() {
        String reply = ask("Koji najskuplji laptop imate?", "ThinkPad E14 16 GB 512 GB", "2345.67");
        assertEquals("Najskuplji laptop u našoj ponudi je ThinkPad E14 16 GB 512 GB, po cijeni od 2.345,67 KM.", reply);
    }
    @Test void budgetListsHaveNoMetadata() {
        for (String reply : new String[]{ask("Koje tastature imate do 100 KM?", "K120", "39.90"),
                ask("Koji miš preporučujete za 300 KM?", "M90", "19.00")}) {
            assertFalse(reply.contains("ID")); assertFalse(reply.contains("structuredContent"));
            assertFalse(reply.contains("MCP")); assertTrue(reply.contains("KM"));
        }
    }
    @Test void modelPresentationPreservesNumbersAndPublicSku() {
        assertEquals("Logitech M90 — 19,00 KM, 16 GB, SKU: ABC-46.",
                AiChatService.customerReply("Logitech M90 (ID: 46) — 19,00 KM, 16 GB, SKU: ABC-46."));
        for (String label : new String[]{"productId: 46", "categoryId: 5", "conversationId: 123", "product_id=46"})
            assertFalse(AiChatService.customerReply("M90 " + label).contains(label));
    }
    @Test void rawToolPayloadAndTraceAreNotCustomerAnswers() {
        for (String raw : new String[]{"{\"id\":46}", "```json\n{}\n```", "Pozvao sam searchProducts sa limit 1.", "MCP alat je vratio JSON"}) {
            assertEquals("Nisam uspio pripremiti jasan odgovor. Molim vas pokušajte ponovo.", AiChatService.customerReply(raw));
        }
    }
    @Test void modelInstructionsSeparateInternalToolsFromCustomerPresentation() {
        var builder = org.mockito.Mockito.mock(org.springframework.ai.chat.client.ChatClient.Builder.class,
                org.mockito.Mockito.RETURNS_SELF);
        new AiChatService(builder, null, null, null, null, null);
        var prompt = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(builder).defaultSystem(prompt.capture());
        for (String rule : new String[]{"Ne prikazuj interne ID", "Ne prikazuj sirovi JSON",
                "Javni SKU", "ne proglašavaj najskuplji proizvod najboljim", "maxPrice"})
            assertTrue(prompt.getValue().contains(rule), rule);
    }
}
