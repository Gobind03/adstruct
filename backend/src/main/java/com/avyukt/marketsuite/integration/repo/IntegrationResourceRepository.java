package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationResource;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationResourceRepository extends JpaRepository<IntegrationResource, UUID> {

    List<IntegrationResource> findByIntegrationAccountId(UUID accountId);

    List<IntegrationResource> findByIntegrationAccountIdAndResourceType(UUID accountId, ResourceType resourceType);

    Optional<IntegrationResource> findByIntegrationAccountIdAndResourceTypeAndExternalResourceId(
            UUID accountId, ResourceType resourceType, String externalResourceId);
}
