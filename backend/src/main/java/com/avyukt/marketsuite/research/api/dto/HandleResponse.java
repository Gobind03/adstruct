package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record HandleResponse(
        UUID id,
        UUID competitorId,
        String platformType,
        String handle,
        String url,
        OffsetDateTime createdAt) {}
