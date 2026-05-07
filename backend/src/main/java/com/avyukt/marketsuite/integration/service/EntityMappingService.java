package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.CampaignReportDataRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationResourceRepository;
import com.avyukt.marketsuite.integration.repo.PlatformEntityMappingRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class EntityMappingService {

    private static final Logger log = LoggerFactory.getLogger(EntityMappingService.class);

    private final PlatformEntityMappingRepository mappingRepo;
    private final IntegrationAccountRepository accountRepo;
    private final IntegrationResourceRepository resourceRepo;
    private final WorkspaceRepository workspaceRepo;
    private final CampaignReportDataRepository reportDataRepo;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public EntityMappingService(
            PlatformEntityMappingRepository mappingRepo,
            IntegrationAccountRepository accountRepo,
            IntegrationResourceRepository resourceRepo,
            WorkspaceRepository workspaceRepo,
            CampaignReportDataRepository reportDataRepo,
            PermissionService permissionService,
            AuditService auditService) {
        this.mappingRepo = mappingRepo;
        this.accountRepo = accountRepo;
        this.resourceRepo = resourceRepo;
        this.workspaceRepo = workspaceRepo;
        this.reportDataRepo = reportDataRepo;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public PlatformEntityMapping createMapping(
            UUID workspaceId, UUID accountId, UUID resourceId, String internalEntityType, UUID internalEntityId,
            String externalEntityType, String externalEntityId, String externalParentId, String metaJson) {
        Workspace workspace = workspaceRepo
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireOrgAccess(workspace.getOrg().getId());

        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));

        IntegrationResource resource = null;
        if (resourceId != null) {
            resource = resourceRepo.findById(resourceId).orElse(null);
        }

        PlatformEntityMapping mapping = PlatformEntityMapping.builder()
                .workspace(workspace)
                .integrationAccount(account)
                .resource(resource)
                .internalEntityType(internalEntityType)
                .internalEntityId(internalEntityId)
                .externalEntityType(externalEntityType)
                .externalEntityId(externalEntityId)
                .externalParentId(externalParentId)
                .metaJson(metaJson != null ? metaJson : "{}")
                .build();

        mapping = mappingRepo.save(mapping);

        if ("CAMPAIGN".equalsIgnoreCase(internalEntityType) && "CAMPAIGN".equalsIgnoreCase(externalEntityType)) {
            int backfilled = reportDataRepo.backfillInternalCampaignId(
                    accountId, externalEntityId, internalEntityId);
            if (backfilled > 0) {
                log.info("Backfilled internal_campaign_id on {} report rows for external campaign {}",
                        backfilled, externalEntityId);
            }
        }

        auditService.log(workspace.getOrg().getId(), workspaceId, SecurityUtils.currentUserId(),
                "CREATE_ENTITY_MAPPING", "PlatformEntityMapping", mapping.getId(), null,
                "{\"internalEntityType\":\"" + internalEntityType + "\",\"externalEntityType\":\"" + externalEntityType + "\"}");
        return mapping;
    }

    @Transactional(readOnly = true)
    public List<PlatformEntityMapping> getMappingsByInternal(UUID workspaceId, String internalEntityType, UUID internalEntityId) {
        return mappingRepo.findByWorkspaceIdAndInternalEntityTypeAndInternalEntityId(workspaceId, internalEntityType, internalEntityId);
    }

    @Transactional(readOnly = true)
    public List<PlatformEntityMapping> getMappingsByExternal(UUID accountId, String externalEntityType, String externalEntityId) {
        return mappingRepo.findByIntegrationAccountIdAndExternalEntityTypeAndExternalEntityId(accountId, externalEntityType, externalEntityId);
    }

    public void deleteMapping(UUID workspaceId, UUID mappingId) {
        PlatformEntityMapping mapping = mappingRepo
                .findById(mappingId)
                .orElseThrow(() -> new ResourceNotFoundException("PlatformEntityMapping", "id", mappingId));
        Workspace workspace = mapping.getWorkspace();
        permissionService.requireOrgAccess(workspace.getOrg().getId());

        mappingRepo.delete(mapping);
        auditService.log(workspace.getOrg().getId(), workspaceId, SecurityUtils.currentUserId(),
                "DELETE_ENTITY_MAPPING", "PlatformEntityMapping", mappingId, null, null);
    }
}
