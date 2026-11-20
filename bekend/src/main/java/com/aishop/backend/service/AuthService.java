
package com.aishop.backend.service;

import com.aishop.backend.dto.AuthResponse;
import com.aishop.backend.dto.LoginRequest;
import com.aishop.backend.dto.RegisterRequest;
import com.aishop.backend.entity.Role;
import com.aishop.backend.entity.User;
import com.aishop.backend.repository.UserRepository;
import com.aishop.backend.security.JwtService;
import com.aishop.backend.dto.RefreshTokenRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long expirationSeconds;
    private final RefreshTokenService refreshTokenService;


    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            @Value("${app.jwt.expiration-seconds}") long expirationSeconds) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.expirationSeconds = expirationSeconds;
        this.refreshTokenService = refreshTokenService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        validatePasswordLength(request.password());

        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        user.setRole(Role.USER);

        User savedUser = userRepository.saveAndFlush(user);

        return createAuthResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {

        System.out.println("LOGIN SERVICE POZVAN");
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmail(email)
                .orElseThrow(this::invalidCredentials);

        if (!passwordEncoder.matches(
                request.password(),
                user.getPasswordHash())) {

            throw invalidCredentials();
        }

        return createAuthResponse(user);
    }



    public AuthResponse refresh(
            RefreshTokenRequest request) {

        RefreshTokenService.RotationResult result =
                refreshTokenService.rotateRefreshToken(
                        request.refreshToken()
                );

        if (result == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid or expired refresh token"
            );
        }

        User user = result.user();

        String accessToken = jwtService.generateToken(user);

        return new AuthResponse(
                accessToken,
                result.refreshToken(),
                "Bearer",
                expirationSeconds,
                user.getId(),
                user.getEmail(),
                user.getRole().name()
        );
    }

    public void logout(RefreshTokenRequest request) {

        refreshTokenService.revokeRefreshToken(
                request.refreshToken()
        );
    }




    private AuthResponse createAuthResponse(User user) {

        String accessToken = jwtService.generateToken(user);

        String refreshToken =
                refreshTokenService.createRefreshToken(user);

        return new AuthResponse(
                accessToken,
                refreshToken,
                "Bearer",
                expirationSeconds,
                user.getId(),
                user.getEmail(),
                user.getRole().name()
        );
    }


    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validatePasswordLength(String password) {

        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must not exceed 72 UTF-8 bytes"
            );
        }
    }

    private ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        );
    }
}
