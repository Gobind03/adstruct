package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.Disclaimer;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DisclaimerRepository extends JpaRepository<Disclaimer, UUID> {

    @Query(
            "SELECT d FROM Disclaimer d WHERE d.org.id = :orgId"
                    + " AND (:workspaceId IS NULL OR d.workspace.id = :workspaceId)"
                    + " AND (:status IS NULL OR d.status = :status)"
                    + " ORDER BY d.createdAt DESC")
    List<Disclaimer> findFiltered(UUID orgId, UUID workspaceId, BrandStatus status);
}
