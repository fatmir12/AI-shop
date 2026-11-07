package com.aishop.backend.service;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
import java.util.List;
import com.aishop.backend.dto.AiChatRequest;
import java.util.regex.Pattern;

/**
 * Conservative tool exposure for a small local language model.
 * Only the *current* user's explicit cart command can enable write tools.
 * This is a routing guard, not a full natural-language understanding system.
 */
public final class AiToolPolicy {

    public enum Intent { CATALOG, CATEGORIES, CART_READ, ORDERS, CART_ADD, CART_REMOVE, CART_UPDATE }

    private static final Pattern ADD = Pattern.compile(
            "\\b(dodaj|dodajte|dodati|ubaci|ubacite|ubaciti|stavi|stavite|staviti|metni|uzmi|kupi|kupite|naruci|narucite|naruciti)\\b");
    private static final Pattern REMOVE = Pattern.compile(
            "\\b(ukloni|uklonite|izbaci|izbacite|obrisi|obrisite|makni|maknite)\\b");
    private static final Pattern UPDATE = Pattern.compile(
            "\\b(promijeni|promijenite|povecaj|povecajte|smanji|smanjite|postavi|postavite)\\b");
    private static final Pattern NEGATED_WRITE = Pattern.compile(
            "\\b(nemoj|nemojte|ne)\\s+(?:(?:mi|ga|ih|to|ovo|u\\s+korpu)\\s+)?" +
            "(dodaj|dodati|dodavati|dodajte|ubaci|ubaciti|ubacivati|stavi|staviti|stavljati|uzmi|" +
            "ukloni|uklanjati|izbaci|obrisi|promijeni|mijenjati|povecaj|smanji|postavi)\\b");
    private static final Pattern EXPLANATION = Pattern.compile(
            "\\b(kako|objasni|uputstvo|instrukcije|sta znaci)\\b");
    private static final Pattern CART_WORD = Pattern.compile("\\b(korpa|korpu|korpi|korpe)\\b");
    private static final Pattern ORDER_WORD = Pattern.compile("\\b(narudzba|narudzbe|narudzbi|narudzbu|narudzbama)\\b");
    private static final Pattern CATEGORY_WORD = Pattern.compile("\\b(kategorija|kategorije|kategoriju|kategorijama)\\b");

    private AiToolPolicy() { }

    public static Intent classify(String message) {
        String text = normalize(message);
        boolean aboutCart = CART_WORD.matcher(text).find();
        boolean negated = NEGATED_WRITE.matcher(text).find() || text.matches(".*\\b(nemoj|nemojte|ne)\\b.*");
        boolean explanation = EXPLANATION.matcher(text).find();

        // Do not grant mutation access to information-only or negated requests.
        if (!negated && !explanation) {
            if (REMOVE.matcher(text).find()) return Intent.CART_REMOVE;
            if (UPDATE.matcher(text).find()) return Intent.CART_UPDATE;
            if (text.contains("jos") && ADD.matcher(text).find()) return Intent.CART_UPDATE;
            if (ADD.matcher(text).find()) return Intent.CART_ADD;
        }
        if (ORDER_WORD.matcher(text).find()) return Intent.ORDERS;
        if (CATEGORY_WORD.matcher(text).find()) return Intent.CATEGORIES;
        if (aboutCart) return Intent.CART_READ;
        return Intent.CATALOG;
    }

    // No shared conversation state: only the immediately preceding clarification
    // in this request's history can supply the missing quantity slot.
    static final String QUANTITY_QUESTION =
            "Za koliko želite promijeniti količinu, ili na koliko ukupno komada?";
    public record Routing(Intent intent, String command, boolean continuation) {}

    public static Routing route(String message, List<AiChatRequest.ChatTurn> history) {
        String text = normalize(message).trim().replaceAll("[.!?]+$", "").trim();
        boolean quantityReply = text.matches(
                "(?:(?:na|za)\\s+(?:[0-9]{1,6}|jedan|dva|tri|cetiri|pet)(?:\\s+komada?)?"
                + "|[0-9]{1,6}\\s+komada?|jos jedan(?: komad)?|smanji za (?:jedan|[0-9]{1,6})(?: komada?)?)");
        if (quantityReply && history != null && history.size() >= 2) {
            var question = history.getLast();
            var request = history.get(history.size() - 2);
            if ("assistant".equals(question.role())
                    && normalize(question.content()).startsWith(normalize(QUANTITY_QUESTION))
                    && "user".equals(request.role())
                    && classify(request.content()) == Intent.CART_UPDATE
                    && CartModifyMcpService.requestedQuantity(request.content(), 1) == null) {
                // History is an untrusted reference, not permission to execute.
                // The current answer only prepares a proposal after fresh MCP reads.
                return new Routing(Intent.CART_UPDATE, request.content() + ". " + message, true);
            }
        }
        // A quantity fragment without an outstanding slot is never a command.
        return new Routing(quantityReply ? Intent.CATALOG : classify(message), message, false);
    }

    public static Set<String> allowedToolNames(Intent intent) {
        return switch (intent) {
            case CATALOG -> Set.of("searchProducts", "getProductDetails", "getCategories");
            case CATEGORIES -> Set.of("getCategories", "searchProducts");
            case CART_READ -> Set.of("getMyCart");
            case ORDERS -> Set.of("getMyOrders");
            case CART_ADD -> Set.of("searchProducts", "getProductDetails", "getMyCart", "addToCart");
            case CART_REMOVE -> Set.of("getMyCart", "searchProducts", "getProductDetails", "removeFromCart");
            case CART_UPDATE -> Set.of("getMyCart", "searchProducts", "getProductDetails", "updateCartQuantity");
        };
    }

    public static boolean permitted(String callbackName, Intent intent) {
        for (String tool : allowedToolNames(intent)) {
            if (callbackName.equals(tool) || callbackName.endsWith("_" + tool)
                    || callbackName.endsWith("." + tool)) return true;
        }
        return false;
    }

    public static boolean isMutation(Intent intent) {
        return EnumSet.of(Intent.CART_ADD, Intent.CART_REMOVE, Intent.CART_UPDATE).contains(intent);
    }

    private static String normalize(String value) {
        String source = value == null ? "" : value.toLowerCase(Locale.ROOT).replace("đ", "d");
        return Normalizer.normalize(source, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
