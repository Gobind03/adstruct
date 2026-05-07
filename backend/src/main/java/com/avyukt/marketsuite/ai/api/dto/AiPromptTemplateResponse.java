package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiPromptTemplateResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String name,
        String description,
        String purpose,
        String status,
        String outputFormat,
        String inputSchemaJson,
        String outputSchemaJson,
        String systemPrompt,
        String userPromptTemplate,
        String guardrailsText,
        String tags,
        int version,
        UUID parentTemplateId,
        UUID createdByUserId,
        UUID updatedByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
