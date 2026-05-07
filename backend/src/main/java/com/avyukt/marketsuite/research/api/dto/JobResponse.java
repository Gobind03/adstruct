package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record JobResponse(
        UUID id,
        UUID workspaceId,
        String jobType,
        String status,
        UUID requestedByUserId,
        Map<String, Object> inputJson,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt,
        Map<String, Object> statsJson,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
