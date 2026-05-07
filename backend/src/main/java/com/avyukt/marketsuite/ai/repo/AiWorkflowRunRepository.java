package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiWorkflowRun;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiWorkflowRunRepository extends JpaRepository<AiWorkflowRun, UUID> {

    List<AiWorkflowRun> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<AiWorkflowRun> findByWorkflowDefinitionId(UUID workflowDefinitionId);
}
