package com.avyukt.marketsuite.measurement.api.dto;

import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.measurement.domain.AdEventType;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdEventRequest(
        @NotNull(message = "Workspace ID is required") UUID workspaceId,
        @NotNull(message = "Campaign ID is required") UUID campaignId,
        UUID sponsoredUnitId,
        @NotNull(message = "Event type is required") AdEventType eventType,
        @NotNull(message = "Event time is required") OffsetDateTime eventTime,
        PlatformType platformType,
        String metaJson,
        String sessionId,
        String userAgent,
        String ipHash
) {}
