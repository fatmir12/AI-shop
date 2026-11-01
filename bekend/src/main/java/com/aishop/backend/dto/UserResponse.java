
package com.aishop.backend.dto;

import com.aishop.backend.entity.User;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
