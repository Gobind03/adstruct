package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiToolCallResponse(
        UUID id,
        UUID conversationId,
        String toolName,
        String status,
        String inputJson,
        String outputJson,
        String errorMessage,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt,
        OffsetDateTime createdAt) {}
