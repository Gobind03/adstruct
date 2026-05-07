package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.IntentType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TargetSetResponse(
        UUID id,
        UUID campaignId,
        IntentType intentType,
        String topicsJson,
        String geoJson,
        String negativeTopicsJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
