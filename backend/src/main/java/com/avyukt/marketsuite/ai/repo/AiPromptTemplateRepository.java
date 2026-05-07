package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiPromptTemplate;
import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.avyukt.marketsuite.ai.domain.PromptScope;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiPromptTemplateRepository extends JpaRepository<AiPromptTemplate, UUID> {

    List<AiPromptTemplate> findByOrgIdAndScopeAndStatus(
            UUID orgId, PromptScope scope, PromptStatus status);

    List<AiPromptTemplate> findByOrgId(UUID orgId);

    Optional<AiPromptTemplate> findByOrgIdAndNameAndVersion(UUID orgId, String name, int version);

    List<AiPromptTemplate> findByOrgIdAndPurpose(UUID orgId, LlmCallPurpose purpose);
}
