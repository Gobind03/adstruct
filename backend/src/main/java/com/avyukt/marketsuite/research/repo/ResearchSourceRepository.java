package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.ResearchSource;
import com.avyukt.marketsuite.research.domain.SourceType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchSourceRepository extends JpaRepository<ResearchSource, UUID> {

    List<ResearchSource> findByWorkspaceId(UUID workspaceId);

    List<ResearchSource> findByWorkspaceIdAndSourceType(
            UUID workspaceId, SourceType sourceType);

    List<ResearchSource> findByCompetitorId(UUID competitorId);
}
