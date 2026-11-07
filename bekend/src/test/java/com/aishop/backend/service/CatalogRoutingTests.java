package com.aishop.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CatalogRoutingTests {
    @Test void singularMouseUsesCatalogTool() {
        var search = mock(ToolCallback.class);
        when(search.getToolDefinition()).thenReturn(ToolDefinition.builder()
                .name("searchProducts").description("search").inputSchema("{}").build());
        when(search.call(anyString())).thenReturn("[]");
        var categories = mock(ToolCallback.class);
        when(categories.getToolDefinition()).thenReturn(ToolDefinition.builder()
                .name("getCategories").description("categories").inputSchema("{}").build());
        when(categories.call("{}")).thenReturn("[{\"id\":1,\"name\":\"Miševi\"}]");
        assertNotNull(new CatalogMcpAnswerService(new ObjectMapper()).tryAnswer(
                "Koji najjeftiniji miš imate?", new ToolCallback[]{search, categories}));
        verify(search).call(anyString());
    }
}
