package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.BrandAsset;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BrandAssetRepository extends JpaRepository<BrandAsset, UUID> {

    @Query(
            "SELECT a FROM BrandAsset a WHERE a.org.id = :orgId"
                    + " AND (:workspaceId IS NULL OR a.workspace.id = :workspaceId)"
                    + " AND (:status IS NULL OR a.status = :status)"
                    + " ORDER BY a.createdAt DESC")
    List<BrandAsset> findFiltered(UUID orgId, UUID workspaceId, BrandStatus status);
}
