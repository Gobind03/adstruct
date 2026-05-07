package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.*;
import com.avyukt.marketsuite.integration.service.connectors.*;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SyncJobService {

    private static final Logger log = LoggerFactory.getLogger(SyncJobService.class);

    private final IntegrationSyncJobRepository syncJobRepo;
    private final IntegrationAccountRepository accountRepo;
    private final IntegrationResourceRepository resourceRepo;
    private final WorkspaceRepository workspaceRepo;
    private final UserRepository userRepo;
    private final ReportDataPersistenceService persistenceService;
    private final ConnectorRegistry connectorRegistry;
    private final TokenRefreshService tokenRefreshService;
    private final PermissionService permissionService;
    private final AuditService auditService;

    public SyncJobService(
            IntegrationSyncJobRepository syncJobRepo,
            IntegrationAccountRepository accountRepo,
            IntegrationResourceRepository resourceRepo,
            WorkspaceRepository workspaceRepo,
            UserRepository userRepo,
            ReportDataPersistenceService persistenceService,
            ConnectorRegistry connectorRegistry,
            TokenRefreshService tokenRefreshService,
            PermissionService permissionService,
            AuditService auditService) {
        this.syncJobRepo = syncJobRepo;
        this.accountRepo = accountRepo;
        this.resourceRepo = resourceRepo;
        this.workspaceRepo = workspaceRepo;
        this.userRepo = userRepo;
        this.persistenceService = persistenceService;
        this.connectorRegistry = connectorRegistry;
        this.tokenRefreshService = tokenRefreshService;
        this.permissionService = permissionService;
        this.auditService = auditService;
    }

    public IntegrationSyncJob createJob(UUID orgId, UUID accountId, UUID workspaceId, UUID resourceId, SyncMode mode) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        UUID userId = SecurityUtils.currentUserId();
        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        AppUser user = userRepo.findById(userId).orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));
        Workspace workspace = workspaceId != null ? workspaceRepo.findById(workspaceId).orElse(null) : null;
        IntegrationResource resource = resourceId != null ? resourceRepo.findById(resourceId).orElse(null) : null;

        IntegrationSyncJob job = IntegrationSyncJob.builder()
                .integrationAccount(account)
                .resource(resource)
                .workspace(workspace)
                .syncMode(mode)
                .status(SyncStatus.QUEUED)
                .requestedByUser(user)
                .build();

        job = syncJobRepo.save(job);
        auditService.log(orgId, workspaceId, userId, "CREATE_SYNC_JOB", "IntegrationSyncJob", job.getId(), null,
                "{\"accountId\":\"" + accountId + "\",\"mode\":\"" + mode + "\"}");
        return job;
    }

    public IntegrationSyncJob runJob(UUID orgId, UUID jobId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        IntegrationSyncJob job = syncJobRepo
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationSyncJob", "id", jobId));

        job.setStatus(SyncStatus.RUNNING);
        job.setStartedAt(OffsetDateTime.now());
        syncJobRepo.save(job);

        try {
            IntegrationAccount account = job.getIntegrationAccount();
            IntegrationConnector connector = connectorRegistry.getConnector(account.getPlatformType()).orElse(null);
            String token = tokenRefreshService.getAccessToken(account);

            if (connector != null && token != null) {
                String adAccountId = account.getExternalAccountId();
                if (job.getResource() != null) {
                    adAccountId = job.getResource().getExternalResourceId();
                }
                ReportRequest req = new ReportRequest(
                        java.time.LocalDate.now().minusDays(7), java.time.LocalDate.now(), "DAY", adAccountId);
                List<CampaignReportRow> rows = connector.fetchCampaignReport(token, req);

                int fetched = rows.size();
                int upserted = 0;
                int errors = 0;

                for (CampaignReportRow row : rows) {
                    try {
                        upserted += persistenceService.persistReportRow(row, job, account);
                    } catch (Exception e) {
                        errors++;
                        log.warn("Failed to persist report row for campaign {}: {}",
                                row.externalCampaignId(), e.getMessage());
                    }
                }

                job.setStatus(SyncStatus.SUCCESS);
                job.setStatsJson("{\"fetched\":" + fetched
                        + ",\"upserted\":" + upserted
                        + ",\"errors\":" + errors + "}");
            } else {
                job.setStatus(SyncStatus.SUCCESS);
                job.setStatsJson("{\"fetched\":0,\"upserted\":0,\"errors\":0}");
            }

            account.setLastSyncAt(OffsetDateTime.now());
            accountRepo.save(account);
        } catch (Exception e) {
            log.error("Sync job {} failed: {}", jobId, e.getMessage());
            job.setStatus(SyncStatus.FAILED);
            job.setErrorMessage(e.getMessage() != null
                    ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 500))
                    : "Unknown error");
        }

        job.setFinishedAt(OffsetDateTime.now());
        job = syncJobRepo.save(job);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "RUN_SYNC_JOB", "IntegrationSyncJob", jobId,
                null, "{\"status\":\"" + job.getStatus() + "\"}");
        return job;
    }

    @Transactional(readOnly = true)
    public List<IntegrationSyncJob> listJobs(UUID orgId, UUID accountId, UUID workspaceId, SyncStatus status) {
        permissionService.requireOrgAccess(orgId);
        return syncJobRepo.findFiltered(orgId, accountId, workspaceId, status);
    }
}
