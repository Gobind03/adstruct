package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.GovernanceCheckRun;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GovernanceCheckRunRepository extends JpaRepository<GovernanceCheckRun, UUID> {

    List<GovernanceCheckRun> findByWorkspaceIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            UUID workspaceId, String entityType, UUID entityId);

    List<GovernanceCheckRun> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
