package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiCitationResponse(
        UUID id,
        String citationType,
        String referenceType,
        UUID referenceId,
        String url,
        String label,
        String metaJson,
        OffsetDateTime createdAt) {}
