package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record HealthSummaryResponse(
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
