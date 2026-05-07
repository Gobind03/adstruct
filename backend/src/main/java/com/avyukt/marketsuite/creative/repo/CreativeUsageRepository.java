package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeUsage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeUsageRepository extends JpaRepository<CreativeUsage, UUID> {

    List<CreativeUsage> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<CreativeUsage> findByWorkspaceIdAndCreativeEntityTypeAndCreativeEntityId(
            UUID workspaceId, String creativeEntityType, UUID creativeEntityId);

    List<CreativeUsage> findByWorkspaceIdAndUsedEntityTypeAndUsedEntityId(
            UUID workspaceId, String usedEntityType, UUID usedEntityId);
}
