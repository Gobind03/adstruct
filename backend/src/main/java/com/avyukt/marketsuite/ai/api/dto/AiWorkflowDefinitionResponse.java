package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiWorkflowDefinitionResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String name,
        String description,
        String stepsJson,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
