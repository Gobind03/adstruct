package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.BrandRuleSet;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BrandRuleSetRepository extends JpaRepository<BrandRuleSet, UUID> {

    @Query(
            "SELECT rs FROM BrandRuleSet rs WHERE rs.org.id = :orgId"
                    + " AND (:workspaceId IS NULL OR rs.workspace.id = :workspaceId)"
                    + " AND (:status IS NULL OR rs.status = :status)"
                    + " ORDER BY rs.createdAt DESC")
    List<BrandRuleSet> findFiltered(UUID orgId, UUID workspaceId, BrandStatus status);
}
