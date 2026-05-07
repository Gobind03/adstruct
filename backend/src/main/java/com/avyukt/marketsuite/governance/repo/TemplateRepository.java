package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.Template;
import com.avyukt.marketsuite.governance.domain.TemplateStatus;
import com.avyukt.marketsuite.governance.domain.TemplateType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface TemplateRepository extends JpaRepository<Template, UUID> {

    @Query(
            "SELECT t FROM Template t WHERE t.org.id = :orgId"
                    + " AND (:workspaceId IS NULL OR t.workspace.id = :workspaceId)"
                    + " AND (:templateType IS NULL OR t.templateType = :templateType)"
                    + " AND (:status IS NULL OR t.status = :status)"
                    + " ORDER BY t.updatedAt DESC")
    List<Template> findFiltered(UUID orgId, UUID workspaceId, TemplateType templateType, TemplateStatus status);
}
