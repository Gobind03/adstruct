package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiWorkflowDefinition;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiWorkflowDefinitionRepository extends JpaRepository<AiWorkflowDefinition, UUID> {

    List<AiWorkflowDefinition> findByOrgId(UUID orgId);

    List<AiWorkflowDefinition> findByOrgIdAndStatus(UUID orgId, PromptStatus status);
}
