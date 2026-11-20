
package com.aishop.backend.mcp;

import com.aishop.backend.entity.Category;
import com.aishop.backend.repository.CategoryRepository;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class CategoryMcpTools {

    private final CategoryRepository categoryRepository;

    public CategoryMcpTools(
            CategoryRepository categoryRepository) {

        this.categoryRepository = categoryRepository;
    }

    @McpTool(
            name = "getCategories",
            description = """
                    Get all product categories available
                    in the AIShop online store.

                    Returns category IDs, names and descriptions.

                    Use this tool when the customer asks
                    which product categories are available,
                    or needs help finding a category.
                    """,
            annotations = @McpTool.McpAnnotations(
                    readOnlyHint = true,
                    destructiveHint = false,
                    idempotentHint = true,
                    openWorldHint = false
            )
    )
    @Transactional(readOnly = true)
    public List<CategoryResult> getCategories() {

        System.out.println("MCP getCategories called");

        List<CategoryResult> categories =
                categoryRepository.findAll()
                        .stream()
                        .map(this::toCategoryResult)
                        .toList();

        System.out.println(
                "MCP found categories: " + categories.size()
        );

        return categories;
    }

    private CategoryResult toCategoryResult(Category category) {

        return new CategoryResult(
                category.getId(),
                category.getName(),
                category.getDescription()
        );
    }

    public record CategoryResult(
            Long id,
            String name,
            String description
    ) {
    }
}
