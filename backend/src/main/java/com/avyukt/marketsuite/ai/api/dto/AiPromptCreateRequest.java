package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiPromptCreateRequest(
        @NotNull String name,
        String description,
        @NotNull String purpose,
        String scope,
        String outputFormat,
        String inputSchemaJson,
        String outputSchemaJson,
        @NotNull String systemPrompt,
        @NotNull String userPromptTemplate,
        String guardrailsText,
        String tags,
        UUID workspaceId) {}
