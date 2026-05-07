package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeAiRunLink;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeAiRunLinkRepository extends JpaRepository<CreativeAiRunLink, UUID> {

    List<CreativeAiRunLink> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<CreativeAiRunLink> findByProducedEntityTypeAndProducedEntityId(
            String producedEntityType, UUID producedEntityId);

    List<CreativeAiRunLink> findByAiPromptRunId(UUID aiPromptRunId);
}
