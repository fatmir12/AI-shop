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
    private static final Pattern NUMBER = Pattern.compile("(?iu)\\b(?:kolicin[aeu]|komada?|puta|x)\\s*[:=]?\\s*(\\d{1,6})\\b");
    private static final Pattern DIRECT_NUMBER = Pattern.compile("(?iu)\\b(\\d{1,6})\\s*(?:komada?|x)\\b");
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
            return "Trenutno ne mogu pripremiti dodavanje u korpu. Pokušajte ponovo.";
        }

        int quantity = quantity(message);
        if (quantity < 1) {
            return "Koliko komada želite dodati? Navedite količinu od 1 do 20.";
        }

        // Search catalog by MCP, never guess a product ID.
        // Skip null optional parameters because MCP schema rejects them.
        List<JsonNode> products;
        try {
            products = ProductReferenceResolver.catalog(mapper, callbacks);
        } catch (RuntimeException e) {
            System.err.println("AIShop MCP catalog lookup failed: " + e.getMessage());
            return "Nisam uspio provjeriti katalog, pa dodavanje nije pripremljeno.";
        }
        if (products.isEmpty()) {
            return "Trenutno nema dostupnih proizvoda koje mogu dodati u korpu.";
        }

        List<JsonNode> candidates = ProductReferenceResolver.resolve(products, message, history);

        if (candidates.size() != 1) {
            return candidates.isEmpty()
                    ? "Nisam mogao pouzdano pronaći taj proizvod u katalogu. Napišite njegov puni naziv. Korpa nije promijenjena."
                    : "Pronašao sam više mogućih proizvoda. Navedite puni naziv proizvoda koji želite dodati. Korpa nije promijenjena.";
        }

        JsonNode chosen = candidates.getFirst();
        long productId = chosen.path("id").asLong(-1);
        String productName = chosen.path("name").asText("proizvod");
        if (productId <= 0 || !ProductReferenceResolver.available(chosen, quantity)) {
            return "Taj proizvod trenutno nije dostupan za dodavanje. Korpa nije promijenjena.";
        }

        // Include existing quantity when the authenticated cart tool is available.
        ToolCallback cart = find(callbacks, "getMyCart");
        if (cart != null) {
            try {
                JsonNode items = new CartModifyMcpService(mapper)
                        .unwrapCart(mapper.readTree(cart.call("{}")), 0).path("items");
                int existing = 0;
                for (JsonNode item : items) if (item.path("productId").asLong(-1) == productId)
                    existing += item.path("quantity").asInt();
                if (!ProductReferenceResolver.available(chosen, existing + quantity))
                    return "Nema dovoljno zaliha za traženu ukupnu količinu. Korpa nije promijenjena.";
            } catch (Exception ex) {
                return "Nisam uspio provjeriti korpu. Dodavanje nije pripremljeno.";
            }
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

    private ToolCallback find(ToolCallback[] callbacks, String requested) {
        for (ToolCallback callback : callbacks) {
            String name = callback.getToolDefinition().name();
            if (name.equals(requested) || name.endsWith("_" + requested)
                    || name.endsWith("." + requested)) return callback;
        }
        return null;
    }

    private String norm(String text) {
        String lower = (text == null ? "" : text).toLowerCase(Locale.ROOT).replace('đ', 'd');
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
