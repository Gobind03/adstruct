package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.ResearchDigestReport;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchDigestReportRepository extends JpaRepository<ResearchDigestReport, UUID> {

    List<ResearchDigestReport> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
