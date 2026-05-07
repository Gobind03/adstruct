package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record InsightResponse(
        UUID id,
        UUID workspaceId,
        String category,
        String insightType,
        String title,
        String summary,
        Map<String, Object> detailsJson,
        String confidence,
        String status,
        UUID competitorId,
        List<String> relatedKeywords,
        List<String> relatedTopics,
        String language,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        long evidenceCount) {}
