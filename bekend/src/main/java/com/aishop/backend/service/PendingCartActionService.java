
package com.aishop.backend.service;

import com.aishop.backend.dto.AddCartItemRequest;
import com.aishop.backend.dto.UpdateCartItemRequest;
import com.aishop.backend.dto.ShoppingCartResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PendingCartActionService {

    private final ShoppingCartService cartService;

    private final ConcurrentHashMap<String, PendingAction> actions =
            new ConcurrentHashMap<>();

    public PendingCartActionService(
            ShoppingCartService cartService) {

        this.cartService = cartService;
    }

    // Vrste operacija nad korpom
    public enum ActionType {
        ADD,
        REMOVE,
        UPDATE
    }

    // Privremeno sacuvana operacija koja ceka potvrdu
    public record PendingAction(
            String actionId,
            Long userId,
            ActionType type,
            Long productId,
            Long itemId,
            Integer quantity,
            Instant expiresAt,
            String requestId
    ) {
    }

    // Odgovor nakon uspjesne potvrde
    public record ConfirmationResult(
            String message,
            ShoppingCartResponse cart
    ) {
    }

    // 1. Priprema operacije bez izmjene korpe
    public PendingAction create(
            Long userId,
            ActionType type,
            Long productId,
            Long itemId,
            Integer quantity) {

        return create(userId, type, productId, itemId, quantity, null);
    }

    public PendingAction create(Long userId, ActionType type, Long productId,
                                Long itemId, Integer quantity, String requestId) {
        actions.entrySet().removeIf(entry -> !Instant.now().isBefore(entry.getValue().expiresAt()));
        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        if (type == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Action type is required"
            );
        }

        switch (type) {

            case ADD -> {
                requirePositive(productId, "productId");
                requirePositive(quantity, "quantity");
            }

            case REMOVE -> {
                requirePositive(itemId, "itemId");
            }

            case UPDATE -> {
                requirePositive(itemId, "itemId");
                requirePositive(quantity, "quantity");
            }
        }

        // Svaka operacija dobija jedinstveni ID
        String actionId = UUID.randomUUID().toString();

        // Operacija vrijedi 10 minuta
        PendingAction action = new PendingAction(
                actionId,
                userId,
                type,
                productId,
                itemId,
                quantity,
                Instant.now().plus(10, ChronoUnit.MINUTES),
                requestId
        );

        // Cuvanje prijedloga u memoriji
        actions.put(actionId, action);

        System.out.println(
                "Pending cart action created: "
                        + action.actionId()
                        + ", type=" + action.type()
        );

        return action;
    }

    public java.util.List<PendingAction> forRequest(Long userId, String requestId) {
        return actions.values().stream()
                .filter(action -> action.userId().equals(userId) && requestId.equals(action.requestId()))
                .filter(action -> Instant.now().isBefore(action.expiresAt()))
                .sorted(java.util.Comparator.comparing(PendingAction::expiresAt))
                .toList();
    }

    public boolean isPending(Long userId, String actionId) {
        var action = actions.get(actionId);
        return action != null && action.userId().equals(userId) && Instant.now().isBefore(action.expiresAt());
    }
    public synchronized void revoke(Long userId, String actionId) {
        var action = actions.get(actionId);
        if (action != null && action.userId().equals(userId)) actions.remove(actionId, action);
    }

    // 2. Potvrda i izvrsavanje operacije
    public synchronized ConfirmationResult confirm(
            Long userId,
            String actionId) {

        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        PendingAction action = actions.get(actionId);

        // Provjera da operacija pripada korisniku
        if (action == null ||
                !action.userId().equals(userId)) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Pending action not found"
            );
        }

        // Provjera isteka operacije
        if (!Instant.now().isBefore(action.expiresAt())) {

            actions.remove(actionId, action);

            throw new ResponseStatusException(
                    HttpStatus.GONE,
                    "Confirmation has expired"
            );
        }

        // Ista operacija ne moze se potvrditi dva puta
        if (!actions.remove(actionId, action)) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Action already processed"
            );
        }

        // Poziv postojece ShoppingCartService logike
        ShoppingCartResponse cart = switch (action.type()) {

            case ADD -> cartService.addItem(
                    userId,
                    new AddCartItemRequest(
                            action.productId(),
                            action.quantity()
                    )
            );

            case REMOVE -> cartService.removeItem(
                    userId,
                    action.itemId()
            );

            case UPDATE -> cartService.updateItem(
                    userId,
                    action.itemId(),
                    new UpdateCartItemRequest(
                            action.quantity()
                    )
            );
        };

        System.out.println(
                "Cart action confirmed: "
                        + action.actionId()
        );

        return new ConfirmationResult(
                "Promjena korpe je uspješno izvršena.",
                cart
        );
    }

    // Provjera ID-eva
    private void requirePositive(Long value, String field) {

        if (value == null || value <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    field + " must be positive"
            );
        }
    }

    // Provjera kolicine
    private void requirePositive(Integer value, String field) {

        if (value == null || value <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    field + " must be positive"
            );
        }
    }
}
