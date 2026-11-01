
package com.aishop.backend.service;

import com.aishop.backend.entity.RefreshToken;
import com.aishop.backend.entity.User;
import com.aishop.backend.repository.RefreshTokenRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final long expirationDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${app.refresh-token.expiration-days}")
            long expirationDays) {

        this.refreshTokenRepository = refreshTokenRepository;
        this.expirationDays = expirationDays;
    }

    @Transactional
    public String createRefreshToken(User user) {

        String rawToken = generateRandomToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setFamilyId(UUID.randomUUID());
        refreshToken.setExpiresAt(nowUtc().plusDays(expirationDays));

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }

    @Transactional
    public RotationResult rotateRefreshToken(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            return null;
        }

        String tokenHash = hashToken(rawToken);

        RefreshToken oldToken = refreshTokenRepository
                .findByTokenHashForUpdate(tokenHash)
                .orElse(null);

        if (oldToken == null) {
            return null;
        }

        LocalDateTime now = nowUtc();

        // Token je vec iskoristen ili ponisten
        if (oldToken.getRevokedAt() != null) {

            refreshTokenRepository.revokeFamily(
                    oldToken.getFamilyId(), now
            );

            return null;
        }

        // Token je istekao
        if (!oldToken.getExpiresAt().isAfter(now)) {

            oldToken.setRevokedAt(now);
            return null;
        }

        // Ponistavamo stari token
        oldToken.setRevokedAt(now);

        // Generisemo novi token
        String newRawToken = generateRandomToken();

        RefreshToken newToken = new RefreshToken();
        newToken.setUser(oldToken.getUser());
        newToken.setTokenHash(hashToken(newRawToken));

        // Zadrzavamo istu porodicu tokena
        newToken.setFamilyId(oldToken.getFamilyId());

        newToken.setExpiresAt(
                now.plusDays(expirationDays)
        );

        refreshTokenRepository.save(newToken);

        return new RotationResult(
                oldToken.getUser(),
                newRawToken
        );
    }

    @Transactional
    public void revokeRefreshToken(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawToken);

        refreshTokenRepository
                .findByTokenHashForUpdate(tokenHash)
                .ifPresent(token -> {

                    if (token.getRevokedAt() == null) {
                        token.setRevokedAt(nowUtc());
                    }
                });
    }


    private String generateRandomToken() {

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }

    private String hashToken(String token) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256 algorithm is unavailable", e
            );
        }
    }

    private LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    public record RotationResult(
            User user,
            String refreshToken
    ) {
    }
}
