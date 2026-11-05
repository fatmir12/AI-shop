package com.aishop.backend.service;

import com.aishop.backend.dto.AiChatRequest;
import org.springframework.ai.tool.ToolCallback;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Request-local resolution. History supplies references, never authorization or product data. */
final class ProductReferenceResolver {
    static String norm(String s) {
        return Normalizer.normalize(s == null ? "" : s.toLowerCase(Locale.ROOT).replace('đ', 'd'),
                Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
    static ToolCallback tool(ToolCallback[] tools, String name) {
        return Arrays.stream(tools).filter(t -> {
            String n = t.getToolDefinition().name();
            return n.equals(name) || n.endsWith("_" + name) || n.endsWith("." + name);
        }).findFirst().orElse(null);
    }
    static List<JsonNode> records(ObjectMapper mapper, String raw) {
        return unwrap(mapper, mapper.readTree(raw), 0);
    }
    private static List<JsonNode> unwrap(ObjectMapper m, JsonNode n, int depth) {
        if (depth > 10 || n == null || n.isNull()) throw new IllegalStateException("Invalid MCP response");
        if (n.isTextual()) return unwrap(m, m.readTree(n.asText()), depth + 1);
        if (n.path("isError").asBoolean(false)) throw new IllegalStateException("MCP error");
        if (n.isArray()) {
            List<JsonNode> result = new ArrayList<>();
            for (JsonNode child : n) result.addAll(unwrap(m, child, depth + 1));
            return result;
        }
        if (n.has("id") && n.has("name")) return List.of(n);
        for (String key : List.of("structuredContent", "result", "products", "data", "content", "text"))
            if (n.has(key)) return unwrap(m, n.get(key), depth + 1);
        throw new IllegalStateException("Invalid MCP product response");
    }
    static List<JsonNode> resolve(List<JsonNode> products, String message, List<AiChatRequest.ChatTurn> history) {
        String text = norm(message);
        var id = Pattern.compile("\\b(?:productid|id\\s*proizvoda)\\s*[:=#]?\\s*(\\d+)\\b").matcher(text);
        if (id.find()) {
            String wanted = id.group(1);
            return products.stream().filter(p -> p.path("id").asText().equals(wanted)).toList();
        }
        List<JsonNode> named = names(products, text);
        if (!named.isEmpty()) return named;
        // Do not substitute a generic category for a named but absent model.
        if (Pattern.compile("\\b(thinkpad|lenovo|dell|elitebook|asus|acer|xps)\\b").matcher(text).find()) return List.of();
        boolean reference = Pattern.compile("\\b(taj|tog|ovaj|ovog|onaj|njega|ga|prvi|maloprije)\\b").matcher(text).find();
        if (reference && history != null) {
            for (int i = history.size() - 1; i >= 0; i--) {
                var turn = history.get(i);
                if (!"assistant".equals(turn.role())) continue;
                named = names(products, norm(turn.content()));
                if (!named.isEmpty()) {
                    if (text.contains("prvi")) return List.of(named.stream().min(Comparator.comparingInt(
                            p -> norm(turn.content()).indexOf(norm(p.path("name").asText())))).orElseThrow());
                    return named;
                }
            }
        }
        String category = category(text);
        if (category != null) return products.stream().filter(p ->
                norm(p.path("categoryName").asText()).contains(category)
                || norm(p.path("name").asText()).contains(category)).toList();
        if (reference || text.contains("kolicin")) return products;
        return List.of();
    }
    private static List<JsonNode> names(List<JsonNode> products, String text) {
        var exact = products.stream().filter(p -> !p.path("name").asText().isBlank()
                && text.contains(norm(p.path("name").asText()))).toList();
        if (!exact.isEmpty()) return exact;
        var tokens = Pattern.compile("\\b(thinkpad|lenovo|dell|elitebook|asus|acer|xps)\\b").matcher(text);
        List<String> words = new ArrayList<>();
        while (tokens.find()) words.add(tokens.group());
        if (words.isEmpty()) return List.of();
        return products.stream().filter(p -> words.stream().allMatch(w -> norm(p.path("name").asText()).contains(w))).toList();
    }
    static String category(String text) {
        if (text.contains("laptop") || text.contains("notebook")) return "laptop";
        if (text.contains("telefon") || text.contains("mobitel")) return "telefon";
        if (text.contains("slusalic")) return "slusalic";
        if (text.contains("tastatur")) return "tastatur";
        return null;
    }
    static List<JsonNode> catalog(ObjectMapper mapper, ToolCallback[] tools) {
        ToolCallback search = tool(tools, "searchProducts");
        if (search == null) throw new IllegalStateException("Catalog unavailable");
        List<JsonNode> products = records(mapper, search.call("{}"));
        ToolCallback details = tool(tools, "getProductDetails");
        if (details == null) return products;
        return products.stream().map(p -> records(mapper, details.call(
                "{\"productId\":" + p.path("id").asLong() + "}")).getFirst()).toList();
    }
    static boolean available(JsonNode p, int quantity) {
        return p.path("id").asLong(-1) > 0 && p.path("available").asBoolean(false)
                && p.path("stock").asInt(-1) >= quantity;
    }
}
