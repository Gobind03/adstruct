package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiRedactionRule;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiRedactionRuleRepository extends JpaRepository<AiRedactionRule, UUID> {

    List<AiRedactionRule> findByWorkspaceIdAndEnabledTrue(UUID workspaceId);

    List<AiRedactionRule> findByWorkspaceId(UUID workspaceId);
}
