package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.*;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkspaceIntegrationService {

    private final WorkspaceIntegrationRepository wsIntegRepo;
    private final IntegrationAccountRepository accountRepo;
    private final IntegrationResourceRepository resourceRepo;
    private final WorkspaceRepository workspaceRepo;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public WorkspaceIntegrationService(
            WorkspaceIntegrationRepository wsIntegRepo,
            IntegrationAccountRepository accountRepo,
            IntegrationResourceRepository resourceRepo,
            WorkspaceRepository workspaceRepo,
            PermissionService permissionService,
            AuditService auditService) {
        this.wsIntegRepo = wsIntegRepo;
        this.accountRepo = accountRepo;
        this.resourceRepo = resourceRepo;
        this.workspaceRepo = workspaceRepo;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<WorkspaceIntegration> listByWorkspace(UUID workspaceId) {
        return wsIntegRepo.findByWorkspaceId(workspaceId);
    }

    public WorkspaceIntegration mapToWorkspace(
            UUID workspaceId, UUID accountId, UUID resourceId, boolean enabled, boolean isDefault, String settingsJson) {
        Workspace workspace = workspaceRepo
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireWorkspaceRole(
                workspace.getOrg().getId(), workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);

        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        if (!account.getOrg().getId().equals(workspace.getOrg().getId())) {
            throw new IllegalArgumentException("Account does not belong to the same organization as workspace");
        }

        IntegrationResource resource = null;
        if (resourceId != null) {
            resource = resourceRepo
                    .findById(resourceId)
                    .orElseThrow(() -> new ResourceNotFoundException("IntegrationResource", "id", resourceId));
        }

        if (isDefault) {
            clearExistingDefault(workspaceId, account.getPlatformType());
        }

        WorkspaceIntegration wi = WorkspaceIntegration.builder()
                .workspace(workspace)
                .integrationAccount(account)
                .integrationResource(resource)
                .enabled(enabled)
                .isDefault(isDefault)
                .settingsJson(settingsJson != null ? settingsJson : "{}")
                .build();

        wi = wsIntegRepo.save(wi);

        auditService.log(workspace.getOrg().getId(), workspaceId, SecurityUtils.currentUserId(),
                "MAP_WORKSPACE_INTEGRATION", "WorkspaceIntegration", wi.getId(), null,
                "{\"accountId\":\"" + accountId + "\",\"isDefault\":" + isDefault + "}");
        return wi;
    }

    public WorkspaceIntegration setDefault(UUID workspaceId, UUID wsIntegrationId) {
        WorkspaceIntegration wi = wsIntegRepo
                .findById(wsIntegrationId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkspaceIntegration", "id", wsIntegrationId));
        Workspace workspace = wi.getWorkspace();
        permissionService.requireWorkspaceRole(
                workspace.getOrg().getId(), workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);

        clearExistingDefault(workspaceId, wi.getIntegrationAccount().getPlatformType());
        wi.setDefault(true);
        wi = wsIntegRepo.save(wi);

        auditService.log(workspace.getOrg().getId(), workspaceId, SecurityUtils.currentUserId(),
                "SET_DEFAULT_INTEGRATION", "WorkspaceIntegration", wi.getId(), null, "{\"isDefault\":true}");
        return wi;
    }

    public WorkspaceIntegration update(UUID workspaceId, UUID wsIntegrationId, Boolean enabled, String settingsJson) {
        WorkspaceIntegration wi = wsIntegRepo
                .findById(wsIntegrationId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkspaceIntegration", "id", wsIntegrationId));
        Workspace workspace = wi.getWorkspace();
        permissionService.requireWorkspaceRole(
                workspace.getOrg().getId(), workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);

        if (enabled != null) wi.setEnabled(enabled);
        if (settingsJson != null) wi.setSettingsJson(settingsJson);
        return wsIntegRepo.save(wi);
    }

    public void unmap(UUID workspaceId, UUID wsIntegrationId) {
        WorkspaceIntegration wi = wsIntegRepo
                .findById(wsIntegrationId)
                .orElseThrow(() -> new ResourceNotFoundException("WorkspaceIntegration", "id", wsIntegrationId));
        Workspace workspace = wi.getWorkspace();
        permissionService.requireWorkspaceRole(
                workspace.getOrg().getId(), workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);

        wsIntegRepo.delete(wi);
        auditService.log(workspace.getOrg().getId(), workspaceId, SecurityUtils.currentUserId(),
                "UNMAP_WORKSPACE_INTEGRATION", "WorkspaceIntegration", wsIntegrationId, null, null);
    }

    private void clearExistingDefault(UUID workspaceId, PlatformType platformType) {
        wsIntegRepo.findDefaultByWorkspaceAndPlatform(workspaceId, platformType).ifPresent(existing -> {
            existing.setDefault(false);
            wsIntegRepo.save(existing);
        });
    }
}
