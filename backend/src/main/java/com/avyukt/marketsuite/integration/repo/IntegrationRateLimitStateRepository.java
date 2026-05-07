package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationRateLimitState;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationRateLimitStateRepository extends JpaRepository<IntegrationRateLimitState, UUID> {

    Optional<IntegrationRateLimitState> findByIntegrationAccountId(UUID accountId);
}
