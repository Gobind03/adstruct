package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SnapshotResponse(
        UUID id,
        UUID workspaceId,
        UUID sourceId,
        String snapshotType,
        OffsetDateTime capturedAt,
        String contentHash,
        String title,
        String summaryText,
        String rawText,
        Map<String, Object> rawJson,
        String sentiment,
        List<String> tags,
        UUID createdByUserId,
        OffsetDateTime createdAt) {}
