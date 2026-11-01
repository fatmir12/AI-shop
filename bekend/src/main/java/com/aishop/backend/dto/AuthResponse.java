
package com.aishop.backend.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long expiresIn,
        Long userId,
        String email,
        String role
) {
}
