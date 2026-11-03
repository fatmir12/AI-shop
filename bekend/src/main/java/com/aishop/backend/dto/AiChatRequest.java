
package com.aishop.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(

        @NotBlank(message = "Message is required")
        @Size(max = 2000)
        String message,

        @Valid CartActionRequest cartAction

) {
}
