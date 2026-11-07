
package com.aishop.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CatalogMcpAnswerService {

    private final ObjectMapper mapper;

    public CatalogMcpAnswerService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public String tryAnswer(
            String message,
            ToolCallback[] callbacks) {

        String normalized = normalize(message);

        // Ne presreci zahtjeve za promjenu korpe,
        // pregled korpe ili narudzbi.
        if (isCartOrOrderRequest(normalized)) {
            return null;
        }

        if (!isCatalogQuestion(normalized)) {
            return null;
        }

        String category = requestedCategory(normalized);
        BigDecimal maxPrice = parseMaxPrice(normalized);
        BigDecimal minPrice = parsePrice(normalized.replace("manje od", "ispod"), "(?:od|iznad|min(?:imalno)?)");
        boolean cheapest = normalized.contains("najjeftin");
        boolean expensive = normalized.contains("najskuplj");
        boolean descending = expensive || normalized.contains("desc")
                || normalized.contains("opadaju") || normalized.contains("silazno");

        ToolCallback searchTool =
                find(callbacks, "searchProducts");

        if (searchTool == null) {
            throw new IllegalStateException(
                    "MCP searchProducts tool is not available"
            );
        }

        // Parametri koje saljemo MCP alatu.
        // Opcionalna polja bez vrijednosti izostavljamo.
        var args = mapper.createObjectNode();

        // Filtriranje po kategoriji samo kada
        // korisnik trazi konkretnu kategoriju.
        if (category != null) {

            ToolCallback categoriesTool =
                    find(callbacks, "getCategories");

            if (categoriesTool == null) {
                throw new IllegalStateException(
                        "MCP getCategories tool is not available"
                );
            }

            List<JsonNode> categories =
                    readRecords(categoriesTool.call("{}"));

            Long categoryId = null;

            for (JsonNode c : categories) {

                String categoryName =
                        normalize(c.path("name").asText(""));

                if (category.equals(requestedCategory(categoryName))) {
                    categoryId = c.path("id").asLong();
                    break;
                }
            }

            if (categoryId == null || categoryId <= 0) {
                return "Trenutno nemamo trazenu " +
                        "kategoriju u katalogu.";
            }

            args.put("categoryId", categoryId);
        }

        if (maxPrice != null) {
            args.put("maxPrice", maxPrice);
        }

        if (minPrice != null) args.put("minPrice", minPrice);
        args.put("sortDirection", descending ? "DESC" : "ASC");
        args.put("limit", cheapest || expensive ? 1 : 20);
        args.put("availableOnly", true);

        System.out.println(
                "AIShop direct MCP catalog search: " + args
        );

        // STVARNI MCP POZIV - bez generisanja proizvoda.
        String rawResult = searchTool.call(args.toString());

        List<JsonNode> products = readRecords(rawResult);

        System.out.println(
                "AIShop MCP catalog result count: " +
                        products.size()
        );

        if (products.isEmpty()) {
            if (minPrice != null) {
                return "Trenutno nemamo dostupnih proizvoda u traženom cjenovnom rasponu.";
            }

            if (category != null && maxPrice != null) {
                return "Trenutno nemamo dostupnih proizvoda " +
                        "u trazenoj kategoriji do " +
                        money(maxPrice) + " KM.";
            }

            if (category != null) {
                return "Trenutno nemamo dostupnih proizvoda " +
                        "u trazenoj kategoriji.";
            }

            if (maxPrice != null) {
                return "Trenutno nemamo dostupnih proizvoda " +
                        "do " + money(maxPrice) + " KM.";
            }

            return "Trenutno nemamo dostupnih " +
                    "proizvoda u prodavnici.";
        }

        // Odgovor formiramo samo od MCP rezultata.
        StringBuilder answer = new StringBuilder();

        if (cheapest || expensive) {
            answer.append(cheapest ? "Najjeftiniji dostupni proizvod" : "Najskuplji dostupni proizvod");
        } else if (products.size() == 1) {
            answer.append(
                    "Trenutno imamo sljedeci proizvod"
            );
        } else {
            answer.append(
                    "Trenutno imamo sljedece proizvode"
            );
        }

        if (minPrice != null) answer.append(" od ").append(money(minPrice)).append(" KM");
        if (maxPrice != null) {
            answer.append(" do ")
                    .append(money(maxPrice))
                    .append(" KM");
        }

        answer.append(":\n");

        int count = 0;

        for (JsonNode product : products) {

            String name =
                    product.path("name").asText("");

            long id = product.path("id").asLong();

            JsonNode priceNode = product.path("price");

            // Ne prikazujemo nepotpune podatke
            // kao da su stvarni proizvodi.
            if (name.isBlank()
                    || id <= 0
                    || priceNode.isMissingNode()
                    || priceNode.isNull()) {
                throw new IllegalStateException(
                        "Incomplete product in MCP response"
                );
            }

            BigDecimal price;

            try {
                price = new BigDecimal(priceNode.asText());
            } catch (NumberFormatException ex) {
                throw new IllegalStateException(
                        "Invalid price in MCP response",
                        ex
                );
            }

            if (price.signum() < 0) {
                throw new IllegalStateException(
                        "Negative price in MCP response"
                );
            }

            count++;

            answer.append("\n")
                    .append(count)
                    .append(". ")
                    .append(name)
                    .append(" — ")
                    .append(money(price))
                    .append(" KM")
                    .append(" (ID: ")
                    .append(id)
                    .append(")");
        }

        if (products.size() == 1) {
            answer.append(
                    "\n\nZelite li vise informacija " +
                            "o ovom proizvodu?"
            );
        } else {
            answer.append(
                    "\n\nZelite li vise informacija " +
                            "o nekom od ovih proizvoda?"
            );
        }

        return answer.toString();
    }

    private boolean isCatalogQuestion(String text) {

        boolean catalogWords =
                text.contains("proizvod")
                        || text.contains("artik")
                        || text.contains("katalog")
                        || text.contains("ponud")
                        || text.contains("prodaj")
                        || text.contains("laptop")
                        || text.contains("notebook")
                        || text.contains("thinkpad")
                        || text.contains("telefon")
                        || text.contains("mobitel")
                        || text.contains("slusalic")
                        || text.contains("tastatur")
                        || requestedCategory(text) != null
                        || text.contains("racunar");

        boolean asking =
                text.contains("imate")
                        || text.contains("imas")
                        || text.contains("ima li")
                        || text.contains("imamo li")
                        || text.contains("trazim")
                        || text.contains("preporuc")
                        || text.contains("pokazi")
                        || text.contains("prikazi")
                        || text.contains("izlistaj")
                        || text.contains("nabroj")
                        || text.contains("dostupn")
                        || text.contains("koliko kost")
                        || text.contains("koje proizvode")
                        || text.contains("sta imate")
                        || text.contains("sta prodajete")
                        || text.contains("sta nudite")
                        || text.contains("do ")
                        || text.contains("ispod ")
                        || text.contains("kupiti")
                        || text.contains("najjeftin") || text.contains("najskuplj")
                        || text.contains("sortir");

        return (catalogWords && asking)
                || text.contains("sta imate u ponudi")
                || text.contains("sta prodajete")
                || text.contains("sta nudite");
    }

    private boolean isCartOrOrderRequest(String text) {

        return text.contains("korp")
                || text.contains("narudz")
                || text.contains("kupio")
                || text.contains("kupila")
                || text.contains("dodaj")
                || text.contains("dodati")
                || text.contains("ubaci")
                || text.contains("ukloni")
                || text.contains("izbaci");
    }

    private ToolCallback find(
            ToolCallback[] callbacks,
            String name) {

        for (ToolCallback callback : callbacks) {

            String actual =
                    callback.getToolDefinition().name();

            if (actual.equals(name)
                    || actual.endsWith("_" + name)
                    || actual.endsWith("." + name)) {
                return callback;
            }
        }

        return null;
    }

    private List<JsonNode> readRecords(String raw) {

        try {
            JsonNode root = mapper.readTree(raw);
            return unwrap(root, 0);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "Cannot read MCP catalog response",
                    e
            );
        }
    }

    private List<JsonNode> unwrap(
            JsonNode node,
            int depth) throws Exception {

        if (depth > 8 || node == null || node.isNull()) {
            return List.of();
        }

        if (node.isTextual()) {
            return unwrap(
                    mapper.readTree(node.asText()),
                    depth + 1
            );
        }

        if (node.isArray()) {

            List<JsonNode> items = new ArrayList<>();

            for (JsonNode child : node) {
                items.addAll(
                        unwrap(child, depth + 1)
                );
            }

            return items;
        }

        if (!node.isObject()) {
            return List.of();
        }

        if (node.path("isError").asBoolean(false)) {
            throw new IllegalStateException(
                    "MCP tool reported an error"
            );
        }

        if (node.has("id") && node.has("name")) {
            return List.of(node);
        }

        for (String key : List.of(
                "structuredContent",
                "result",
                "products",
                "categories",
                "items",
                "data",
                "content",
                "text"
        )) {

            if (node.has(key)) {
                return unwrap(
                        node.get(key),
                        depth + 1
                );
            }
        }

        throw new IllegalStateException(
                "Unexpected MCP catalog response"
        );
    }

    private static String requestedCategory(String text) {

        if (text.matches(
                ".*\\b(laptop|laptopi|laptopa|" +
                        "laptope|notebook|thinkpad)\\b.*"
        )) {
            return "laptop";
        }

        if (text.matches(
                ".*\\b(telefon|telefoni|telefona|" +
                        "mobitel|mobiteli)\\b.*"
        )) {
            return "telefon";
        }

        if (text.matches(
                ".*\\b(slusalice|slusalica)\\b.*"
        )) {
            return "slusalic";
        }

        if (text.matches(
                ".*\\b(tastatura|tastature|" +
                        "tastaturu)\\b.*"
        )) {
            return "tastatur";
        }

        if (text.matches(
                ".*\\b(mis|misevi|misa|miseve|miseva|misu|misem|misevima)\\b.*"
        )) {
            return "mis";
        }

        return null;
    }

    private static BigDecimal parseMaxPrice(String text) {

        return parsePrice(text, "(?:do|za|imam|budzet(?: je)?|ispod|manje od|najvise|max(?:imalno)?)");
    }

    private static BigDecimal parsePrice(String text, String prefix) {
        Matcher match = Pattern.compile("\\b" + prefix + "\\s*([0-9][0-9., ]{0,14})").matcher(text);

        if (!match.find()) {
            return null;
        }

        String raw = match.group(1)
                .trim()
                .replace(" ", "");

        try {
            // 2.000,00 -> 2000.00
            if (raw.contains(",") && raw.contains(".")) {
                raw = raw.replace(".", "")
                        .replace(",", ".");
            } else if (raw.contains(",")) {
                raw = raw.replace(",", ".");
            } else if (raw.matches(
                    "\\d{1,3}(\\.\\d{3})+"
            )) {
                raw = raw.replace(".", "");
            }

            return new BigDecimal(raw);

        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String money(BigDecimal price) {

        NumberFormat format = NumberFormat
                .getNumberInstance(
                        Locale.forLanguageTag("bs-BA")
                );

        format.setMinimumFractionDigits(2);
        format.setMaximumFractionDigits(2);

        return format.format(price);
    }

    private static String normalize(String value) {

        String lower = (value == null ? "" : value)
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd');

        return Normalizer.normalize(
                lower,
                Normalizer.Form.NFD
        ).replaceAll("\\p{M}+", "");
    }
}
