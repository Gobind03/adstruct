package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiPromptRunRepository extends JpaRepository<AiPromptRun, UUID> {

    List<AiPromptRun> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<AiPromptRun> findByPromptTemplateIdOrderByCreatedAtDesc(UUID promptTemplateId);
}
