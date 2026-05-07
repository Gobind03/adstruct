package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.ProducedEntityType;
import com.avyukt.marketsuite.research.domain.ResearchAiRunLink;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchAiRunLinkRepository extends JpaRepository<ResearchAiRunLink, UUID> {

    List<ResearchAiRunLink> findByWorkspaceId(UUID workspaceId);

    List<ResearchAiRunLink> findByProducedEntityTypeAndProducedEntityId(
            ProducedEntityType type, UUID id);
}
