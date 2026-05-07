package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record WatchlistResponse(
        UUID id,
        UUID workspaceId,
        String watchlistType,
        String name,
        UUID competitorId,
        Map<String, Object> queryJson,
        String frequency,
        boolean enabled,
        OffsetDateTime lastRefreshedAt,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
