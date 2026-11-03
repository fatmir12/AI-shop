
package com.aishop.backend.controller;

import com.aishop.backend.dto.UserResponse;
import com.aishop.backend.entity.User;
import com.aishop.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public java.util.List<UserResponse> getUsers() {
        return userRepository.findAll().stream().map(UserResponse::from).toList();
    }

    @PutMapping("/me")
    @org.springframework.transaction.annotation.Transactional
    public UserResponse updateProfile(@AuthenticationPrincipal Jwt jwt,
            @jakarta.validation.Valid @RequestBody com.aishop.backend.dto.UpdateProfileRequest request) {
        UserResponse current = getCurrentUser(jwt);
        User user = userRepository.findById(current.id()).orElseThrow();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        return UserResponse.from(userRepository.save(user));
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser(
            @AuthenticationPrincipal Jwt jwt) {

        if (jwt == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        Long userId;

        try {
            userId = Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid token subject"
            );
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "User account not found"
                ));

        return UserResponse.from(user);
    }
}
