
package com.aishop.backend.mcp;

import com.aishop.backend.entity.Product;
import com.aishop.backend.repository.ProductRepository;
import com.aishop.backend.specification.ProductSpecification;

import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
public class ProductMcpTools {

    private final ProductRepository productRepository;

    public ProductMcpTools(
            ProductRepository productRepository) {

        this.productRepository = productRepository;
    }

    @McpTool(
            name = "searchProducts",
            description = """
                    Search the AIShop product catalog
                    using optional filters.

                    Parameters:
                    keyword - name, brand or product type.
                    minPrice - minimum price in BAM.
                    maxPrice - maximum price in BAM.
                    categoryId - existing category ID.
                    availableOnly - only products with stock > 0.

                    All prices are in BAM (KM).
                    Do not convert currencies.

                    Returns up to 20 matching products
                    sorted by price ascending.

                    Use this tool for customer questions
                    about products, prices and availability.
                    """
    )
    @Transactional(readOnly = true)
    public List<ProductSearchResult> searchProducts(

            @McpToolParam(
                    description = "Search keyword, brand or product type",
                    required = false
            )
            String keyword,

            @McpToolParam(
                    description = "Minimum product price in BAM",
                    required = false
            )
            BigDecimal minPrice,

            @McpToolParam(
                    description = "Maximum product price in BAM",
                    required = false
            )
            BigDecimal maxPrice,

            @McpToolParam(
                    description = "Category ID, if known",
                    required = false
            )
            Long categoryId,

            @McpToolParam(
                    description = "True to show only products in stock",
                    required = false
            )
            Boolean availableOnly) {

        System.out.println(
                "MCP searchProducts called: "
                        + "keyword=" + keyword
                        + ", minPrice=" + minPrice
                        + ", maxPrice=" + maxPrice
                        + ", categoryId=" + categoryId
                        + ", availableOnly=" + availableOnly
        );

        if (minPrice != null &&
                minPrice.compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Minimum price cannot be negative"
            );
        }

        if (maxPrice != null &&
                maxPrice.compareTo(BigDecimal.ZERO) < 0) {

            throw new IllegalArgumentException(
                    "Maximum price cannot be negative"
            );
        }

        if (minPrice != null && maxPrice != null &&
                minPrice.compareTo(maxPrice) > 0) {

            throw new IllegalArgumentException(
                    "Minimum price cannot exceed maximum price"
            );
        }

        if (categoryId != null && categoryId <= 0) {

            throw new IllegalArgumentException(
                    "Invalid category ID"
            );
        }

        var specification = ProductSpecification.search(
                keyword,
                minPrice,
                maxPrice,
                categoryId,
                availableOnly
        );

        var page = PageRequest.of(
                0,
                20,
                Sort.by(Sort.Direction.ASC, "price")
        );

        List<ProductSearchResult> results =
                productRepository.findAll(specification, page)
                        .getContent()
                        .stream()
                        .map(this::toSearchResult)
                        .toList();

        System.out.println(
                "MCP found products: " + results.size()
        );

        return results;
    }

    // Kompatibilnost sa starim lokalnim AiCatalogTools
    public List<ProductSearchResult> searchProducts(
            String keyword) {

        return searchProducts(
                keyword,
                null,
                null,
                null,
                null
        );
    }

    private ProductSearchResult toSearchResult(
            Product product) {

        return new ProductSearchResult(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                "BAM",
                product.getStock(),
                product.getStock() > 0
        );
    }

    public record ProductSearchResult(
            Long id,
            String name,
            String description,
            BigDecimal price,
            String currency,
            Integer stock,
            boolean available
    ) {
    }

    @McpTool(
            name = "getProductDetails",
            description = """
                Get detailed information about one AIShop
                product using its numeric product ID.

                Returns product name, description, price
                in BAM, category, stock and availability.

                Use this tool when the customer asks
                about a specific product by ID.
                """,
            annotations = @McpTool.McpAnnotations(
                    readOnlyHint = true,
                    destructiveHint = false,
                    idempotentHint = true,
                    openWorldHint = false
            )
    )
    @Transactional(readOnly = true)
    public ProductDetailsResult getProductDetails(
            @McpToolParam(
                    description = "Unique numeric product ID",
                    required = true
            )
            Long productId) {

        if (productId == null || productId <= 0) {
            throw new IllegalArgumentException(
                    "Invalid product ID"
            );
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Product not found: " + productId
                ));

        System.out.println(
                "MCP getProductDetails called: " + productId
        );

        return new ProductDetailsResult(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                "BAM",
                product.getStock(),
                product.getStock() > 0,
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.getImageUrl()
        );
    }

    public record ProductDetailsResult(
            Long id,
            String name,
            String description,
            BigDecimal price,
            String currency,
            Integer stock,
            boolean available,
            Long categoryId,
            String categoryName,
            String imageUrl
    ) {
    }



}
