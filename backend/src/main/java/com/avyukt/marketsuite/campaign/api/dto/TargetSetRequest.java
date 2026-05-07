package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.IntentType;
import jakarta.validation.constraints.NotNull;

public record TargetSetRequest(
        @NotNull(message = "Intent type is required") IntentType intentType,
        String topicsJson,
        String geoJson,
        String negativeTopicsJson
) {}
