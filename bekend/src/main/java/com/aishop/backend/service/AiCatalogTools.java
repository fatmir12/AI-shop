
package com.aishop.backend.service;

import com.aishop.backend.mcp.ProductMcpTools;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class AiCatalogTools {

    private final ProductMcpTools productMcpTools;

    public AiCatalogTools(ProductMcpTools productMcpTools) {
        this.productMcpTools = productMcpTools;
    }

    @Tool(
            name = "searchProducts",
            description = """
            Search the AIShop product catalog by keyword.
            Returns product names, descriptions,
            prices and available stock.
            Use this tool when the customer asks
            about products in the store.
            """
    )
    public Object searchProducts(
            @ToolParam(
                    description = "Product name or keyword"
            )
            String keyword) {

        return productMcpTools.searchProducts(keyword);
    }
}
