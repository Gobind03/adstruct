package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record SourceResponse(
        UUID id,
        UUID workspaceId,
        String sourceType,
        String title,
        String url,
        UUID competitorId,
        UUID integrationAccountId,
        UUID integrationResourceId,
        String fileUrl,
        String noteText,
        Map<String, Object> metaJson,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
