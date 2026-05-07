package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiWorkflowCreateRequest(
        @NotNull String name,
        String description,
        String scope,
        UUID workspaceId,
        @NotNull String stepsJson) {}
