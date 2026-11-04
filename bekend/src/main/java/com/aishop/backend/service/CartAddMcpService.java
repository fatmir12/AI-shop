package com.aishop.backend.service;

import com.aishop.backend.dto.AiChatRequest;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Deterministic MCP orchestration for clear ADD-to-cart requests.
 * It never modifies the cart: only the MCP tool creates a pending proposal.
 */
@Service
public class CartAddMcpService {
    private static final Pattern NUMBER = Pattern.compile("(?iu)\\b(?:kolicin[aeu]|komada?|puta|x)\\s*[:=]?\\s*(\\d{1,2})\\b");
    private static final Pattern DIRECT_NUMBER = Pattern.compile("(?iu)\\b(\\d{1,2})\\s*(?:komada?|x)\\b");
    private static final Pattern ID = Pattern.compile("(?iu)\\b(?:productid|id\\s*proizvoda)\\s*[:=#]?\\s*(\\d+)\\b");
    private final ObjectMapper mapper;

    public CartAddMcpService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String prepare(String message, List<AiChatRequest.ChatTurn> history,
                          ToolCallback[] callbacks, Long userId, String requestId) {
        ToolCallback search = find(callbacks, "searchProducts");
        ToolCallback add = find(callbacks, "addToCart");
        if (search == null || add == null) {
            return "Trenutno ne mogu pripremiti dodavanje u korpu jer MCP alati nisu dostupni.";
        }

        int quantity = quantity(message);
        if (quantity < 1) {
            return "Koliko komada želite dodati? Navedite količinu od 1 do 20.";
        }

        // Search catalog by MCP, never guess a product ID.
        // Skip null optional parameters because MCP schema rejects them.
        List<JsonNode> products;
        try {
            products = records(search.call("{\"availableOnly\":true}"));
        } catch (RuntimeException e) {
            System.err.println("AIShop MCP catalog lookup failed: " + e.getMessage());
            return "Nisam uspio provjeriti katalog, pa dodavanje nije pripremljeno.";
        }
        if (products.isEmpty()) {
            return "Trenutno nema dostupnih proizvoda koje mogu dodati u korpu.";
        }

        String question = norm(message);
        List<JsonNode> candidates = matching(products, question);

        // References such as 'taj laptop' must resolve to an earlier named
        // product, not to a random product from the catalog.
        if (candidates.isEmpty() && history != null
                && question.matches(".*\\b(taj|taj|ovaj|onaj|njega|jedan)\\b.*")) {
            for (int i = history.size() - 1; i >= 0 && candidates.isEmpty(); i--) {
                AiChatRequest.ChatTurn turn = history.get(i);
                if ("assistant".equals(turn.role())) {
                    candidates = matching(products, norm(turn.content()));
                }
            }
        }

        // For a generic category request, only accept exactly one matching
        // product. A broader catalog cannot be resolved safely by guessing.
        if (candidates.isEmpty()) {
            String category = category(question);
            if (category != null) {
                candidates = products.stream()
                        .filter(p -> isAvailable(p) && norm(p.path("name").asText("")).contains(category))
                        .toList();
            }
        }

        // Explicit numeric IDs are allowed only when they also exist in the
        // authenticated MCP catalog result.
        Matcher id = ID.matcher(question);
        if (id.find()) {
            long requested = Long.parseLong(id.group(1));
            candidates = products.stream()
                    .filter(p -> p.path("id").asLong(-1) == requested && isAvailable(p))
                    .toList();
        }

        if (candidates.size() != 1) {
            return candidates.isEmpty()
                    ? "Nisam mogao pouzdano pronaći taj proizvod u katalogu. Napišite njegov puni naziv ili ID. Korpa nije promijenjena."
                    : "Pronašao sam više mogućih proizvoda. Navedite puni naziv ili ID proizvoda koji želite dodati. Korpa nije promijenjena.";
        }

        JsonNode chosen = candidates.getFirst();
        long productId = chosen.path("id").asLong(-1);
        String productName = chosen.path("name").asText("proizvod");
        if (productId <= 0 || !isAvailable(chosen)) {
            return "Taj proizvod trenutno nije dostupan za dodavanje. Korpa nije promijenjena.";
        }

        // Only the MCP addToCart callback creates the pending proposal.
        // MCP transport propagates the authenticated user and chatRequestId.
        try {
            var args = mapper.createObjectNode();
            args.put("productId", productId);
            args.put("quantity", quantity);
            add.call(args.toString());
            System.out.println("AIShop direct MCP addToCart invoked for request=" + requestId
                    + ", productId=" + productId + ", quantity=" + quantity);
            return "Zatražio sam pripremu dodavanja " + quantity + " kom. proizvoda "
                    + productName + ". Potrebna je potvrda radnje.";
        } catch (RuntimeException ex) {
            System.err.println("AIShop MCP addToCart error: " + ex.getMessage());
            return "Nisam uspio pripremiti dodavanje proizvoda. Korpa nije promijenjena.";
        }
    }

    private List<JsonNode> matching(List<JsonNode> products, String text) {
        return products.stream()
                .filter(this::isAvailable)
                .filter(p -> {
                    String name = norm(p.path("name").asText(""));
                    return !name.isBlank() && text.contains(name);
                })
                .toList();
    }

    private boolean isAvailable(JsonNode product) {
        if (product.has("available") && !product.path("available").asBoolean()) return false;
        return !product.has("stock") || product.path("stock").asInt(0) > 0;
    }

    private int quantity(String message) {
        String t = norm(message);
        Matcher m = NUMBER.matcher(t);
        if (m.find()) return validQuantity(m.group(1));
        m = DIRECT_NUMBER.matcher(t);
        if (m.find()) return validQuantity(m.group(1));
        if (Pattern.compile("\\b(dva|dvije|dvoje)\\b").matcher(t).find()) return 2;
        if (Pattern.compile("\\b(tri)\\b").matcher(t).find()) return 3;
        if (Pattern.compile("\\b(cetiri)\\b").matcher(t).find()) return 4;
        if (Pattern.compile("\\b(pet)\\b").matcher(t).find()) return 5;
        return 1;
    }

    private int validQuantity(String digits) {
        int value = Integer.parseInt(digits);
        return value >= 1 && value <= 20 ? value : -1;
    }

    private String category(String t) {
        if (t.matches(".*\\b(laptop|laptopa|laptope|laptopi)\\b.*")) return "laptop";
        if (t.matches(".*\\b(telefon|telefona|telefone|telefoni)\\b.*")) return "telefon";
        if (t.matches(".*\\b(slusalice|slusalica)\\b.*")) return "slusalic";
        if (t.matches(".*\\b(tastatura|tastaturu)\\b.*")) return "tastatur";
        return null;
    }

    private ToolCallback find(ToolCallback[] callbacks, String requested) {
        for (ToolCallback callback : callbacks) {
            String name = callback.getToolDefinition().name();
            if (name.equals(requested) || name.endsWith("_" + requested)
                    || name.endsWith("." + requested)) return callback;
        }
        return null;
    }

    private List<JsonNode> records(String raw) {
        try {
            return unwrap(mapper.readTree(raw), 0);
        } catch (Exception e) {
            throw new IllegalStateException("Invalid MCP search result", e);
        }
    }

    private List<JsonNode> unwrap(JsonNode node, int depth) throws Exception {
        if (node == null || node.isNull() || depth > 7) return List.of();
        if (node.isTextual()) return unwrap(mapper.readTree(node.asText()), depth + 1);
        if (node.isArray()) {
            List<JsonNode> values = new ArrayList<>();
            for (JsonNode n : node) values.addAll(unwrap(n, depth + 1));
            return values;
        }
        if (!node.isObject()) return List.of();
        if (node.path("isError").asBoolean(false)) throw new IllegalStateException("MCP tool error");
        if (node.has("id") && node.has("name")) return List.of(node);
        for (String key : List.of("structuredContent", "result", "products", "data", "content", "text")) {
            if (node.has(key)) return unwrap(node.get(key), depth + 1);
        }
        throw new IllegalStateException("Unexpected MCP product response");
    }

    private String norm(String text) {
        String lower = (text == null ? "" : text).toLowerCase(Locale.ROOT).replace('đ', 'd');
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
