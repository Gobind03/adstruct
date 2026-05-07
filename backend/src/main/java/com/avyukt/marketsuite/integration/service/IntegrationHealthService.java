package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class IntegrationHealthService {

    private final IntegrationAccountRepository accountRepo;
    private final IntegrationSyncJobRepository syncJobRepo;
    private final IntegrationWebhookEndpointRepository webhookRepo;
    private final IntegrationRateLimitStateRepository rateLimitRepo;

    public IntegrationHealthService(
            IntegrationAccountRepository accountRepo,
            IntegrationSyncJobRepository syncJobRepo,
            IntegrationWebhookEndpointRepository webhookRepo,
            IntegrationRateLimitStateRepository rateLimitRepo) {
        this.accountRepo = accountRepo;
        this.syncJobRepo = syncJobRepo;
        this.webhookRepo = webhookRepo;
        this.rateLimitRepo = rateLimitRepo;
    }

    public HealthSummary computeHealth(UUID accountId) {
        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));

        List<String> warnings = new ArrayList<>();
        String overallStatus = "HEALTHY";

        if (account.getStatus() == IntegrationStatus.ERROR || account.getStatus() == IntegrationStatus.REVOKED) {
            overallStatus = "CRITICAL";
            warnings.add("Account status: " + account.getStatus());
        } else if (account.getStatus() == IntegrationStatus.DISCONNECTED) {
            overallStatus = "DISCONNECTED";
            warnings.add("Account is disconnected");
        }

        if (account.getLastValidatedAt() == null) {
            warnings.add("Connection has never been validated");
        } else if (account.getLastValidatedAt().isBefore(OffsetDateTime.now().minusDays(7))) {
            warnings.add("Last validated over 7 days ago");
            if ("HEALTHY".equals(overallStatus)) overallStatus = "WARNING";
        }

        if (account.getLastSyncAt() == null) {
            warnings.add("No sync has been performed");
        } else if (account.getLastSyncAt().isBefore(OffsetDateTime.now().minusDays(1))) {
            warnings.add("Last sync over 24 hours ago");
            if ("HEALTHY".equals(overallStatus)) overallStatus = "WARNING";
        }

        List<IntegrationSyncJob> recentFailed = syncJobRepo.findByIntegrationAccountIdAndStatus(accountId, SyncStatus.FAILED);
        if (!recentFailed.isEmpty()) {
            warnings.add(recentFailed.size() + " failed sync job(s)");
            if ("HEALTHY".equals(overallStatus)) overallStatus = "WARNING";
        }

        var webhook = webhookRepo.findByIntegrationAccountId(accountId);
        String webhookStatusStr = webhook.map(w -> w.getStatus().name()).orElse("NOT_CONFIGURED");
        if (webhook.isPresent() && webhook.get().getStatus() == WebhookStatus.ERROR) {
            warnings.add("Webhook endpoint in error state");
            if ("HEALTHY".equals(overallStatus)) overallStatus = "WARNING";
        }

        var rateLimit = rateLimitRepo.findByIntegrationAccountId(accountId);
        String rateLimitStr = rateLimit.map(r -> r.getStrategy().name()).orElse("NONE");

        return new HealthSummary(
                accountId,
                account.getPlatformType().name(),
                account.getDisplayName(),
                overallStatus,
                account.getStatus().name(),
                account.getLastValidatedAt(),
                account.getLastSyncAt(),
                webhookStatusStr,
                rateLimitStr,
                warnings);
    }

    public record HealthSummary(
            UUID accountId,
            String platformType,
            String displayName,
            String overallStatus,
            String connectionStatus,
            OffsetDateTime lastValidatedAt,
            OffsetDateTime lastSyncAt,
            String webhookStatus,
            String rateLimitStrategy,
            List<String> warnings) {}
}
