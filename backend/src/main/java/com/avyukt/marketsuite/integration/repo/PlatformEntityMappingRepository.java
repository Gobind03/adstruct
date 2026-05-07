package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.PlatformEntityMapping;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformEntityMappingRepository extends JpaRepository<PlatformEntityMapping, UUID> {

    List<PlatformEntityMapping> findByWorkspaceIdAndInternalEntityTypeAndInternalEntityId(
            UUID workspaceId, String internalEntityType, UUID internalEntityId);

    List<PlatformEntityMapping> findByIntegrationAccountIdAndExternalEntityTypeAndExternalEntityId(
            UUID accountId, String externalEntityType, String externalEntityId);

    List<PlatformEntityMapping> findByWorkspaceId(UUID workspaceId);
}
