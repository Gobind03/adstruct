package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.LinkedEntityType;
import com.avyukt.marketsuite.research.domain.ResearchEntityType;
import com.avyukt.marketsuite.research.domain.ResearchLink;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchLinkRepository extends JpaRepository<ResearchLink, UUID> {

    List<ResearchLink> findByWorkspaceId(UUID workspaceId);

    List<ResearchLink> findByResearchEntityTypeAndResearchEntityId(
            ResearchEntityType type, UUID id);

    List<ResearchLink> findByLinkedEntityTypeAndLinkedEntityId(LinkedEntityType type, UUID id);
}
