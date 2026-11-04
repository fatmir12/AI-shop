package com.aishop.backend.service;

import java.text.Normalizer;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Set;
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
        boolean negated = NEGATED_WRITE.matcher(text).find() || text.contains("ne zelim da");
        boolean explanation = EXPLANATION.matcher(text).find();

        // Do not grant mutation access to information-only or negated requests.
        if (!negated && !explanation) {
            if (REMOVE.matcher(text).find() && aboutCart) return Intent.CART_REMOVE;
            if (UPDATE.matcher(text).find() && aboutCart) return Intent.CART_UPDATE;
            if (ADD.matcher(text).find() && (aboutCart || text.contains("mi jedan") || text.contains("mi dva"))) return Intent.CART_ADD;
        }
        if (ORDER_WORD.matcher(text).find()) return Intent.ORDERS;
        if (CATEGORY_WORD.matcher(text).find()) return Intent.CATEGORIES;
        if (aboutCart) return Intent.CART_READ;
        return Intent.CATALOG;
    }

    public static Set<String> allowedToolNames(Intent intent) {
        return switch (intent) {
            case CATALOG -> Set.of("searchProducts", "getProductDetails");
            case CATEGORIES -> Set.of("getCategories", "searchProducts");
            case CART_READ -> Set.of("getMyCart");
            case ORDERS -> Set.of("getMyOrders");
            case CART_ADD -> Set.of("searchProducts", "getProductDetails", "getMyCart", "addToCart");
            case CART_REMOVE -> Set.of("getMyCart", "removeFromCart");
            case CART_UPDATE -> Set.of("getMyCart", "updateCartQuantity");
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
