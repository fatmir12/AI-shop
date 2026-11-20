
package com.aishop.backend.specification;

import com.aishop.backend.entity.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class ProductSpecification {

    private static final Set<String> STOP_WORDS = Set.of(
            "imate", "trazim", "zelim",
            "proizvod", "proizvodi",
            "ponuda", "ponudi"
    );

    public static Specification<Product> search(
            String keyword,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long categoryId,
            Boolean availableOnly) {

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {

                List<String> words = Arrays.stream(
                                keyword.trim()
                                        .toLowerCase(Locale.ROOT)
                                        .split("\\s+")
                        )
                        .filter(word -> !STOP_WORDS.contains(word))
                        .toList();

                for (String word : words) {

                    String pattern = "%"
                            + escapeLike(word)
                            + "%";

                    Predicate nameMatch = cb.like(
                            cb.lower(root.get("name")),
                            pattern,
                            '\\'
                    );

                    Predicate descriptionMatch = cb.like(
                            cb.lower(root.get("description")),
                            pattern,
                            '\\'
                    );

                    predicates.add(
                            cb.or(nameMatch, descriptionMatch)
                    );
                }
            }

            if (minPrice != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("price"),
                                minPrice
                        )
                );
            }

            if (maxPrice != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("price"),
                                maxPrice
                        )
                );
            }

            if (categoryId != null) {
                predicates.add(
                        cb.equal(
                                root.get("category").get("id"),
                                categoryId
                        )
                );
            }

            if (Boolean.TRUE.equals(availableOnly)) {
                predicates.add(
                        cb.greaterThan(
                                root.get("stock"),
                                0
                        )
                );
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
