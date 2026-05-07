package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record KeywordClusterResponse(
        UUID id,
        UUID workspaceId,
        String name,
        String intentType,
        List<String> keywords,
        Map<String, Object> metricsJson,
        UUID sourceSnapshotId,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
