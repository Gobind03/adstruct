package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.OAuthStateToken;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface OAuthStateTokenRepository extends JpaRepository<OAuthStateToken, UUID> {

    Optional<OAuthStateToken> findByStateAndUsedFalse(String state);

    @Modifying
    @Query("DELETE FROM OAuthStateToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredTokens(OffsetDateTime cutoff);
}
