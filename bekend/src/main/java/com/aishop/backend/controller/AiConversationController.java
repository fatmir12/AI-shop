package com.aishop.backend.controller;

import com.aishop.backend.service.AiConversationService;
import com.aishop.backend.dto.*;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController
@RequestMapping("/api/ai/conversations")
public class AiConversationController {
    private final AiConversationService service;
    public AiConversationController(AiConversationService service) { this.service = service; }
    private long user(Jwt jwt) {
        try {
            long id = jwt == null ? 0 : Long.parseLong(jwt.getSubject());
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException ex) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
    }
    @GetMapping public List<AiConversationService.Conversation> list(@AuthenticationPrincipal Jwt jwt) { return service.list(user(jwt)); }
    @PostMapping public AiConversationService.Conversation create(@AuthenticationPrincipal Jwt jwt) { return service.create(user(jwt)); }
    @GetMapping("/{id}") public AiConversationService.Detail get(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) { return service.get(user(jwt), id); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) { service.delete(user(jwt), id); }
    @PostMapping("/{id}/chat") public AiChatResponse send(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @Valid @RequestBody AiChatRequest request, @RequestHeader(value="X-Chat-Request-ID", required=false) UUID requestId) {
        long user = user(jwt);
        return service.send(user, id, jwt.getTokenValue(), request, requestId == null ? UUID.randomUUID() : requestId);
    }
}
