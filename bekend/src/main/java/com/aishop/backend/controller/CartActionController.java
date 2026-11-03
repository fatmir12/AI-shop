
package com.aishop.backend.controller;

import com.aishop.backend.service.PendingCartActionService;
import com.aishop.backend.service.PendingCartActionService.ConfirmationResult;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai/cart-actions")
public class CartActionController {

    private final PendingCartActionService pendingActions;

    public CartActionController(
            PendingCartActionService pendingActions) {
        this.pendingActions = pendingActions;
    }

    @PostMapping("/{actionId}/confirm")
    public ConfirmationResult confirm(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String actionId) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        Long userId;

        try {
            userId = Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid token subject"
            );
        }

        return pendingActions.confirm(userId, actionId);
    }
}
