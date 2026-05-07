package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.WorkspaceIntegration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceIntegrationRepository extends JpaRepository<WorkspaceIntegration, UUID> {

    @Query("SELECT wi FROM WorkspaceIntegration wi"
            + " JOIN FETCH wi.workspace"
            + " JOIN FETCH wi.integrationAccount"
            + " LEFT JOIN FETCH wi.integrationResource"
            + " WHERE wi.workspace.id = :workspaceId")
    List<WorkspaceIntegration> findByWorkspaceId(UUID workspaceId);

    @Query("SELECT wi FROM WorkspaceIntegration wi"
            + " JOIN FETCH wi.workspace"
            + " JOIN FETCH wi.integrationAccount"
            + " LEFT JOIN FETCH wi.integrationResource"
            + " WHERE wi.workspace.id = :workspaceId AND wi.enabled = :enabled")
    List<WorkspaceIntegration> findByWorkspaceIdAndEnabled(UUID workspaceId, boolean enabled);

    @Query(
            "SELECT wi FROM WorkspaceIntegration wi WHERE wi.workspace.id = :workspaceId"
                    + " AND wi.isDefault = true"
                    + " AND wi.integrationAccount.provider.platformType = :platformType")
    Optional<WorkspaceIntegration> findDefaultByWorkspaceAndPlatform(UUID workspaceId, com.avyukt.marketsuite.integration.domain.PlatformType platformType);

    @Query(
            "SELECT wi FROM WorkspaceIntegration wi WHERE wi.workspace.id = :workspaceId"
                    + " AND wi.isDefault = true"
                    + " AND wi.integrationAccount.provider.category = :category")
    List<WorkspaceIntegration> findDefaultsByWorkspaceAndCategory(UUID workspaceId, com.avyukt.marketsuite.integration.domain.IntegrationCategory category);
}
