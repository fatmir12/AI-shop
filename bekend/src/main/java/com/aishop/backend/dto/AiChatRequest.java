package com.aishop.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AiChatRequest(@NotBlank @Size(max = 2000) String message,
                            @Valid CartActionRequest cartAction,
                            @Size(max = 12) List<@Valid ChatTurn> history) {
    public record ChatTurn(@NotBlank @Pattern(regexp = "user|assistant") String role,
                           @NotBlank @Size(max = 6000) String content) {}
}
