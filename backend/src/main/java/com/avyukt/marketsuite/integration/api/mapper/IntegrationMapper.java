package com.avyukt.marketsuite.integration.api.mapper;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.service.IntegrationHealthService;
import java.math.BigDecimal;
import java.math.RoundingMode;

public final class IntegrationMapper {

    private IntegrationMapper() {}

    public static IntegrationProviderResponse toProviderResponse(IntegrationProvider p) {
        return new IntegrationProviderResponse(
                p.getId(),
                p.getPlatformType().name(),
                p.getCategory().name(),
                p.getDisplayName(),
                p.getAuthType().name(),
                p.getCapabilitiesJson(),
                p.getDocsUrl());
    }

    public static IntegrationAccountResponse toAccountResponse(IntegrationAccount a) {
        return new IntegrationAccountResponse(
                a.getId(),
                a.getOrg().getId(),
                a.getPlatformType().name(),
                a.getProvider() != null ? a.getProvider().getCategory().name() : null,
                a.getDisplayName(),
                a.getStatus().name(),
                a.getAuthType().name(),
                a.getScopesJson(),
                a.getExternalAccountId(),
                a.getConnectedByUser() != null ? a.getConnectedByUser().getId() : null,
                a.getLastValidatedAt(),
                a.getLastSyncAt(),
                a.getErrorCode(),
                a.getErrorMessage(),
                a.getCreatedAt(),
                a.getUpdatedAt());
    }

    public static IntegrationResourceResponse toResourceResponse(IntegrationResource r) {
        return new IntegrationResourceResponse(
                r.getId(),
                r.getIntegrationAccount().getId(),
                r.getResourceType().name(),
                r.getExternalResourceId(),
                r.getDisplayName(),
                r.getStatus().name(),
                r.getMetaJson(),
                r.getLastDiscoveredAt(),
                r.getCreatedAt());
    }

    public static WorkspaceIntegrationResponse toWorkspaceIntegrationResponse(WorkspaceIntegration wi) {
        return new WorkspaceIntegrationResponse(
                wi.getId(),
                wi.getWorkspace().getId(),
                wi.getIntegrationAccount().getId(),
                wi.getIntegrationAccount().getPlatformType().name(),
                wi.getIntegrationAccount().getDisplayName(),
                wi.getIntegrationResource() != null ? wi.getIntegrationResource().getId() : null,
                wi.getIntegrationResource() != null ? wi.getIntegrationResource().getDisplayName() : null,
                wi.isEnabled(),
                wi.isDefault(),
                wi.getSettingsJson(),
                wi.getCreatedAt());
    }

    public static PlatformEntityMappingResponse toMappingResponse(PlatformEntityMapping m) {
        return new PlatformEntityMappingResponse(
                m.getId(),
                m.getWorkspace().getId(),
                m.getIntegrationAccount().getId(),
                m.getResource() != null ? m.getResource().getId() : null,
                m.getInternalEntityType(),
                m.getInternalEntityId(),
                m.getExternalEntityType(),
                m.getExternalEntityId(),
                m.getExternalParentId(),
                m.getMappingStatus(),
                m.getMetaJson(),
                m.getCreatedAt());
    }

    public static SyncJobResponse toSyncJobResponse(IntegrationSyncJob j) {
        return new SyncJobResponse(
                j.getId(),
                j.getIntegrationAccount().getId(),
                j.getResource() != null ? j.getResource().getId() : null,
                j.getWorkspace() != null ? j.getWorkspace().getId() : null,
                j.getSyncMode().name(),
                j.getStatus().name(),
                j.getStartedAt(),
                j.getFinishedAt(),
                j.getStatsJson(),
                j.getErrorMessage(),
                j.getRequestedByUser().getId(),
                j.getCreatedAt());
    }

    public static WebhookResponse toWebhookResponse(IntegrationWebhookEndpoint w, String signingSecret) {
        return new WebhookResponse(
                w.getId(),
                w.getIntegrationAccount().getId(),
                w.getStatus().name(),
                w.getEndpointUrl(),
                signingSecret,
                w.getSubscribedEventsJson(),
                w.getLastReceivedAt(),
                w.getErrorMessage(),
                w.getCreatedAt());
    }

    public static OAuthConfigResponse toOAuthConfigResponse(PlatformOAuthConfig c) {
        return new OAuthConfigResponse(
                c.getId(),
                c.getPlatformType().name(),
                c.getClientId(),
                c.getAuthUrl(),
                c.getTokenUrl(),
                c.getScopes(),
                c.getRedirectUri(),
                c.getExtraParamsJson(),
                c.isEnabled());
    }

    public static CampaignReportDataResponse toReportDataResponse(CampaignReportData r) {
        return new CampaignReportDataResponse(
                r.getId(),
                r.getSyncJob() != null ? r.getSyncJob().getId() : null,
                r.getIntegrationAccount().getId(),
                r.getPlatformType().name(),
                r.getIntegrationAccount().getDisplayName(),
                r.getWorkspace() != null ? r.getWorkspace().getId() : null,
                r.getInternalCampaign() != null ? r.getInternalCampaign().getId() : null,
                r.getInternalCampaign() != null ? r.getInternalCampaign().getName() : null,
                r.getExternalCampaignId(),
                r.getCampaignName(),
                r.getCampaignStatus(),
                r.getSpend(),
                r.getImpressions(),
                r.getClicks(),
                r.getCpc(),
                r.getCpm(),
                r.getCtr(),
                r.getConversions(),
                r.getReportDate(),
                r.getCreatedAt());
    }

    public static CampaignReportSummaryResponse toReportSummaryResponse(Object[] raw) {
        Object[] row = (raw.length == 1 && raw[0] instanceof Object[]) ? (Object[]) raw[0] : raw;
        BigDecimal totalSpend = (BigDecimal) row[0];
        long totalImpressions = ((Number) row[1]).longValue();
        long totalClicks = ((Number) row[2]).longValue();
        long totalConversions = ((Number) row[3]).longValue();
        long campaignCount = ((Number) row[4]).longValue();

        BigDecimal avgCpc = totalClicks > 0
                ? totalSpend.divide(BigDecimal.valueOf(totalClicks), 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal avgCtr = totalImpressions > 0
                ? BigDecimal.valueOf(totalClicks)
                        .divide(BigDecimal.valueOf(totalImpressions), 6, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return new CampaignReportSummaryResponse(
                totalSpend, totalImpressions, totalClicks, totalConversions,
                campaignCount, avgCpc, avgCtr);
    }

    public static WebhookDeliveryResponse toDeliveryResponse(com.avyukt.marketsuite.integration.domain.WebhookDelivery d) {
        return new WebhookDeliveryResponse(
                d.getId(),
                d.getWebhook().getId(),
                d.getPlatformType().name(),
                d.getEventType(),
                d.getStatus(),
                d.getRowsProcessed(),
                d.getErrorMessage(),
                d.getReceivedAt());
    }

    public static HealthSummaryResponse toHealthSummaryResponse(IntegrationHealthService.HealthSummary h) {
        return new HealthSummaryResponse(
                h.accountId(),
                h.platformType(),
                h.displayName(),
                h.overallStatus(),
                h.connectionStatus(),
                h.lastValidatedAt(),
                h.lastSyncAt(),
                h.webhookStatus(),
                h.rateLimitStrategy(),
                h.warnings());
    }
}
