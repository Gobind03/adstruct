package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.TemplateUsage;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateUsageRepository extends JpaRepository<TemplateUsage, UUID> {

    List<TemplateUsage> findByTemplateIdOrderByUsedAtDesc(UUID templateId);

    List<TemplateUsage> findByUsedInEntityTypeAndUsedInEntityId(String entityType, UUID entityId);
}
