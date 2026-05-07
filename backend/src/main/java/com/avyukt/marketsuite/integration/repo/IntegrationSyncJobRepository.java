package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationSyncJob;
import com.avyukt.marketsuite.integration.domain.SyncStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationSyncJobRepository extends JpaRepository<IntegrationSyncJob, UUID> {

    List<IntegrationSyncJob> findByIntegrationAccountId(UUID accountId);

    List<IntegrationSyncJob> findByIntegrationAccountIdAndStatus(UUID accountId, SyncStatus status);

    @Query(
            "SELECT j FROM IntegrationSyncJob j WHERE j.integrationAccount.org.id = :orgId"
                    + " AND (:accountId IS NULL OR j.integrationAccount.id = :accountId)"
                    + " AND (:workspaceId IS NULL OR j.workspace.id = :workspaceId)"
                    + " AND (:status IS NULL OR j.status = :status)"
                    + " ORDER BY j.createdAt DESC")
    List<IntegrationSyncJob> findFiltered(UUID orgId, UUID accountId, UUID workspaceId, SyncStatus status);
}
