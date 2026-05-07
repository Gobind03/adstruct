package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.Competitor;
import com.avyukt.marketsuite.research.domain.CompetitorStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompetitorRepository extends JpaRepository<Competitor, UUID> {

    List<Competitor> findByWorkspaceId(UUID workspaceId);

    List<Competitor> findByWorkspaceIdAndStatus(UUID workspaceId, CompetitorStatus status);
}
