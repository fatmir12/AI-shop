
package com.aishop.backend.controller;

import com.aishop.backend.dto.AiChatRequest;
import com.aishop.backend.dto.AiChatResponse;
import com.aishop.backend.service.AiChatService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    private final AiChatService aiChatService;

    public AiChatController(AiChatService aiChatService) {
        this.aiChatService = aiChatService;
    }

    @PostMapping("/chat")
    public AiChatResponse chat(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AiChatRequest request) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        // 1. Strukturirana operacija nad korpom
        if (request.cartAction() != null) {

            Long userId;

            try {
                userId = Long.valueOf(jwt.getSubject());

                if (userId <= 0) {
                    throw new NumberFormatException(
                            "Invalid user ID"
                    );
                }

            } catch (NumberFormatException ex) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid token subject"
                );
            }

            System.out.println(
                    "AI CHAT preparing cart action: "
                            + request.cartAction()
                            + ", userId=" + userId
            );

            return aiChatService.prepareCartAction(
                    userId,
                    request.cartAction()
            );
        }

        try {
            return aiChatService.chat(request.message(), jwt.getTokenValue(), Long.valueOf(jwt.getSubject()), request.history());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }
}
