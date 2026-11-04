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
            return "MCP alati za korpu trenutno nisu dostupni. Korpa nije promijenjena.";
        }

        Integer quantity = null;
        if (intent == AiToolPolicy.Intent.CART_UPDATE) {
            quantity = requestedTotal(message);
            if (quantity == null) {
                return "Na koliko ukupno komada želite postaviti količinu? "
                        + "Navedite novu ukupnu količinu, npr. 'na 2 komada'.";
            }
            if (quantity < 1) {
                return "Za uklanjanje stavke koristite naredbu 'Ukloni iz korpe'. "
                        + "Količina mora biti veća od nule.";
            }
        }

        try {
            JsonNode cart = unwrapCart(mapper.readTree(getCart.call("{}")), 0);
            JsonNode items = cart.path("items");
            if (!items.isArray() || items.isEmpty()) {
                return "Vaša korpa je prazna. Nema stavke koju mogu promijeniti.";
            }

            List<JsonNode> matches = resolveItems(items, message, history);
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
                return "MCP nije vratio ispravan ID stavke korpe. Korpa nije promijenjena.";
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
            return "Nisam uspio pripremiti promjenu korpe preko MCP-a. "
                    + "Korpa nije promijenjena.";
        }
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

    private List<JsonNode> resolveItems(JsonNode items, String message,
                                        List<AiChatRequest.ChatTurn> history) {
        List<JsonNode> all = new ArrayList<>();
        for (JsonNode item : items) all.add(item);
        String text = normalize(message);

        Matcher explicitId = CART_ITEM_ID.matcher(text);
        if (explicitId.find()) {
            long wanted = Long.parseLong(explicitId.group(1));
            return all.stream().filter(i -> i.path("id").asLong(-1) == wanted).toList();
        }

        List<JsonNode> matched = matchByName(all, text);
        if (!matched.isEmpty()) return matched;

        // Context is used only for clear references, never to guess an item.
        if (Pattern.compile("\\b(taj|taj\\s+laptop|ovaj|onaj|njega|njim|takav)\\b")
                .matcher(text).find() && history != null) {
            for (int i = history.size() - 1; i >= 0; i--) {
                AiChatRequest.ChatTurn turn = history.get(i);
                if ("assistant".equals(turn.role())) {
                    matched = matchByName(all, normalize(turn.content()));
                    if (!matched.isEmpty()) return matched;
                }
            }
        }

        // A product category may identify exactly one item in the user's cart.
        String category = category(text);
        if (category != null) {
            return all.stream().filter(i -> normalize(i.path("productName").asText(""))
                    .contains(category)).toList();
        }
        return List.of();
    }

    private List<JsonNode> matchByName(List<JsonNode> items, String text) {
        var exact = items.stream().filter(i -> {
            String name = normalize(i.path("productName").asText(""));
            return !name.isBlank() && text.contains(name);
        }).toList();
        if (!exact.isEmpty()) return exact;
        // Brand/model reference is accepted only when unambiguous.
        var tokens = Pattern.compile("\\b(lenov[aou]?|thinkpad[aou]?|elitebook|dell|xps|hp|asus|acer)\\b")
                .matcher(text);
        List<String> matchedTokens = new ArrayList<>();
        while (tokens.find()) {
            String token = tokens.group(1);
            if (token.startsWith("lenov")) token = "lenovo";
            if (token.startsWith("thinkpad")) token = "thinkpad";
            matchedTokens.add(token);
        }
        if (matchedTokens.isEmpty()) return List.of();
        return items.stream().filter(i -> {
            String name = normalize(i.path("productName").asText(""));
            return matchedTokens.stream().anyMatch(name::contains);
        }).toList();
    }

    private static String category(String text) {
        if (text.matches(".*\\b(laptop|laptopa|laptope|laptopi)\\b.*")) return "laptop";
        if (text.matches(".*\\b(telefon|telefona|telefoni)\\b.*")) return "telefon";
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

    private JsonNode unwrapCart(JsonNode node, int depth) throws Exception {
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
