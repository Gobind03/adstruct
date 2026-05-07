package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.JobStatus;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResearchJobRepository extends JpaRepository<ResearchJob, UUID> {

    List<ResearchJob> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<ResearchJob> findByWorkspaceIdAndStatus(UUID workspaceId, JobStatus status);
}
