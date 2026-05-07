package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiWorkflowRunResponse(
        UUID id,
        UUID workflowDefinitionId,
        UUID workspaceId,
        UUID conversationId,
        String inputJson,
        String outputJson,
        String status,
        String errorMessage,
        OffsetDateTime createdAt) {}
