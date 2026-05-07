package com.avyukt.marketsuite.measurement.api.dto;

import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.measurement.domain.AdEventType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdEventResponse(
        UUID id,
        UUID workspaceId,
        UUID campaignId,
        UUID sponsoredUnitId,
        AdEventType eventType,
        OffsetDateTime eventTime,
        PlatformType platformType,
        String metaJson,
        String sessionId
) {}
