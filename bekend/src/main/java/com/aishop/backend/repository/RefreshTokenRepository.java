
package com.aishop.backend.repository;

import com.aishop.backend.entity.RefreshToken;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT rt
        FROM RefreshToken rt
        JOIN FETCH rt.user
        WHERE rt.tokenHash = :tokenHash
        """)
    Optional<RefreshToken> findByTokenHashForUpdate(
            @Param("tokenHash") String tokenHash
    );

    List<RefreshToken> findByUserId(Long userId);

    @Modifying
    @Query("""
        UPDATE RefreshToken rt
        SET rt.revokedAt = :revokedAt
        WHERE rt.familyId = :familyId
          AND rt.revokedAt IS NULL
        """)
    int revokeFamily(
            @Param("familyId") UUID familyId,
            @Param("revokedAt") LocalDateTime revokedAt
    );
}
