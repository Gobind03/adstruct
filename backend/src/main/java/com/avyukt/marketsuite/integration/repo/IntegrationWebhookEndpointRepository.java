package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationWebhookEndpoint;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationWebhookEndpointRepository extends JpaRepository<IntegrationWebhookEndpoint, UUID> {

    Optional<IntegrationWebhookEndpoint> findByIntegrationAccountId(UUID accountId);
}
