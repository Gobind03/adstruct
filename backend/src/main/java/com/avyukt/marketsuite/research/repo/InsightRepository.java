package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.Insight;
import com.avyukt.marketsuite.research.domain.InsightStatus;
import com.avyukt.marketsuite.research.domain.ResearchCategory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InsightRepository extends JpaRepository<Insight, UUID> {

    List<Insight> findByWorkspaceId(UUID workspaceId);

    List<Insight> findByWorkspaceIdAndStatus(UUID workspaceId, InsightStatus status);

    List<Insight> findByWorkspaceIdAndCategory(UUID workspaceId, ResearchCategory category);

    List<Insight> findByWorkspaceIdAndCompetitorId(UUID workspaceId, UUID competitorId);

    List<Insight> findByWorkspaceIdAndStatusAndCreatedAtAfter(
            UUID workspaceId, InsightStatus status, OffsetDateTime after);

    long countByWorkspaceId(UUID workspaceId);

    long countByWorkspaceIdAndStatus(UUID workspaceId, InsightStatus status);
}
