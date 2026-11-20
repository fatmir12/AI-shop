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
 * Deterministic MCP flow for UPDATE/REMOVE:
 * getMyCart -> resolve the actual cart item ID -> prepare MCP proposal.
 * Never uses productId as itemId and never changes the cart before confirmation.
 */
@Service
public class CartModifyMcpService {

    private static final Pattern CART_ITEM_ID = Pattern.compile(
            "\\b(?:itemid|id\\s*stavke(?:\\s*korpe)?|stavk[aeu]\\s*(?:korpe\\s*)?(?:id\\s*)?)[\\s:=#]*(\\d+)\\b");
    private static final Pattern EXPLICIT_TOTAL = Pattern.compile(
            "\\b(?:na|ukupno|kolicin[au]\\s*(?:na|od)?|postavi\\s*(?:na)?)\\s*(\\d{1,3})\\s*(?:komada?|artikala?)?\\b");
    private static final Pattern DIRECT_TOTAL = Pattern.compile(
            "\\b(\\d{1,3})\\s*(?:komada?|artikala?)\\b");

    private final ObjectMapper mapper;

    public CartModifyMcpService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String prepare(String message, List<AiChatRequest.ChatTurn> history,
                          ToolCallback[] callbacks, AiToolPolicy.Intent intent,
                          String requestId) {
        if (intent != AiToolPolicy.Intent.CART_UPDATE
                && intent != AiToolPolicy.Intent.CART_REMOVE) {
            return "Ovaj zahtjev nije promjena postojece stavke korpe.";
        }

        ToolCallback getCart = find(callbacks, "getMyCart");
        ToolCallback mutation = find(callbacks,
                intent == AiToolPolicy.Intent.CART_UPDATE ? "updateCartQuantity" : "removeFromCart");
        if (getCart == null || mutation == null) {
            return "Upravljanje korpom trenutno nije dostupno. Korpa nije promijenjena.";
        }

        Integer quantity = null;
        try {
            JsonNode cart = unwrapCart(mapper.readTree(getCart.call("{}")), 0);
            JsonNode items = cart.path("items");
            if (!items.isArray() || items.isEmpty()) {
                return "Vaša korpa je prazna. Nema stavke koju mogu promijeniti.";
            }

            List<JsonNode> catalog = ProductReferenceResolver.catalog(mapper, callbacks);
            List<JsonNode> cartProducts = catalog.stream().filter(p -> {
                for (JsonNode item : items) if (item.path("productId").asLong(-1) == p.path("id").asLong(-2)) return true;
                return false;
            }).toList();
            var resolved = ProductReferenceResolver.resolve(cartProducts, message, history);
            List<JsonNode> matches = new ArrayList<>();
            for (JsonNode item : items) {
                if (resolved.stream().anyMatch(p -> p.path("id").asLong(-2) == item.path("productId").asLong(-1))) matches.add(item);
            }
            Matcher explicit = CART_ITEM_ID.matcher(normalize(message));
            if (explicit.find()) {
                long wanted = Long.parseLong(explicit.group(1));
                matches.clear();
                for (JsonNode item : items) if (item.path("id").asLong(-1) == wanted) matches.add(item);
            }
            if (matches.isEmpty()) {
                return "Ne mogu pronaći traženi proizvod u vašoj korpi. "
                        + "Provjerite naziv proizvoda. Korpa nije promijenjena.";
            }
            if (matches.size() > 1) {
                return "U korpi postoji više mogućih stavki. Navedite tačan naziv "
                        + "proizvoda koji želite promijeniti. Korpa nije promijenjena.";
            }

            JsonNode chosen = matches.getFirst();
            long itemId = chosen.path("id").asLong(-1);
            if (itemId <= 0 || chosen.path("productName").asText("").isBlank()) {
                return "Nisam uspio pouzdano prepoznati stavku korpe. Korpa nije promijenjena.";
            }

            if (intent == AiToolPolicy.Intent.CART_UPDATE) {
                quantity = requestedQuantity(message, chosen.path("quantity").asInt());
                if (quantity == null) return AiToolPolicy.QUANTITY_QUESTION;
                final int total = quantity;
                if (total < 1 || total > 100 || cartProducts.stream().noneMatch(p ->
                        p.path("id").asLong(-1) == chosen.path("productId").asLong(-2)
                        && ProductReferenceResolver.available(p, total)))
                    return "Tražena količina nije dozvoljena ili nema dovoljno zaliha. Korpa nije promijenjena.";
            }

            var args = mapper.createObjectNode();
            args.put("itemId", itemId); // NEVER use productId here.
            if (quantity != null) args.put("quantity", quantity);
            mutation.call(args.toString());
            System.out.println("AIShop direct MCP " + intent + " request=" + requestId
                    + " itemId=" + itemId + (quantity == null ? "" : " quantity=" + quantity));

            String productName = chosen.path("productName").asText();
            if (quantity != null) {
                return "Zatražio sam pripremu promjene količine za " + productName
                        + " na ukupno " + quantity + " komada. Potrebna je potvrda radnje.";
            }
            return "Zatražio sam pripremu uklanjanja proizvoda " + productName
                    + " iz korpe. Potrebna je potvrda radnje.";
        } catch (Exception ex) {
            System.err.println("AIShop MCP cart modification error: " + ex.getMessage());
            return "Nisam uspio pripremiti promjenu korpe. "
                    + "Korpa nije promijenjena.";
        }
    }

    static Integer requestedQuantity(String message, int current) {
        String text = normalize(message);
        text = text.replaceAll("\\bza jedan\\b", "za 1");
        Matcher relative = Pattern.compile("\\bza\\s+(\\d{1,6})\\b").matcher(text);
        if (relative.find()) {
            int delta = Integer.parseInt(relative.group(1));
            return text.lastIndexOf("smanji") > text.lastIndexOf("povecaj") ? current - delta : current + delta;
        }
        if (text.contains("jos jedan")) return current + 1;
        return requestedTotal(message);
    }

    /** Returns only explicit NEW total quantities; refuses ambiguous relative changes. */
    static Integer requestedTotal(String message) {
        String text = normalize(message);
        if (Pattern.compile("\\bza\\s+\\d+\\s+komad").matcher(text).find()) return null;
        Matcher match = EXPLICIT_TOTAL.matcher(text);
        if (!match.find()) match = DIRECT_TOTAL.matcher(text);
        if (match.find(0)) {
            try {
                int number = Integer.parseInt(match.group(1));
                return number <= 100 ? number : null;
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        for (int n = 1; n <= 5; n++) {
            String word = switch (n) {
                case 1 -> "jedan";
                case 2 -> "dva";
                case 3 -> "tri";
                case 4 -> "cetiri";
                default -> "pet";
            };
            if (Pattern.compile("\\b(?:na|ukupno)\\s+" + word + "\\b").matcher(text).find()) return n;
        }
        return null;
    }

    private ToolCallback find(ToolCallback[] tools, String name) {
        for (ToolCallback t : tools) {
            String actual = t.getToolDefinition().name();
            if (actual.equals(name) || actual.endsWith("_" + name)
                    || actual.endsWith("." + name)) return t;
        }
        return null;
    }

    JsonNode unwrapCart(JsonNode node, int depth) throws Exception {
        if (node == null || node.isNull() || depth > 8) {
            throw new IllegalStateException("Empty MCP cart response");
        }
        if (node.isTextual()) return unwrapCart(mapper.readTree(node.asText()), depth + 1);
        if (node.isObject()) {
            if (node.path("isError").asBoolean(false)) {
                throw new IllegalStateException("MCP cart tool returned error");
            }
            if (node.path("items").isArray()) return node;
            for (String key : List.of("structuredContent", "result", "data", "content", "text")) {
                if (node.has(key)) return unwrapCart(node.get(key), depth + 1);
            }
        }
        if (node.isArray() && node.size() == 1) return unwrapCart(node.get(0), depth + 1);
        throw new IllegalStateException("Unexpected MCP cart response structure");
    }

    private static String normalize(String value) {
        String lower = (value == null ? "" : value).toLowerCase(Locale.ROOT).replace('đ', 'd');
        return Normalizer.normalize(lower, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
