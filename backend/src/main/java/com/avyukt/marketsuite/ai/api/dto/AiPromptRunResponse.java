package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiPromptRunResponse(
        UUID id,
        UUID workspaceId,
        UUID promptTemplateId,
        String model,
        String outputText,
        String outputJson,
        String tokenUsageJson,
        Integer latencyMs,
        String status,
        String errorMessage,
        OffsetDateTime createdAt) {}
