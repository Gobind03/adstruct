package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record EvidenceResponse(
        UUID id,
        UUID insightId,
        UUID snapshotId,
        String citationText,
        String citationUrl,
        Map<String, Object> evidenceJson,
        OffsetDateTime createdAt) {}
