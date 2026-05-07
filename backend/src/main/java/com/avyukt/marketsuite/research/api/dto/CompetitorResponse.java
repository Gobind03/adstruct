package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CompetitorResponse(
        UUID id,
        UUID workspaceId,
        String name,
        String websiteUrl,
        String description,
        List<String> categoryTags,
        String status,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
