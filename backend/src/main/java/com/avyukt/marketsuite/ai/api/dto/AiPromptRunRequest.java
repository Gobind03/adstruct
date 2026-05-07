package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiPromptRunRequest(
        @NotNull String inputJson,
        UUID providerOverrideId,
        String modelOverride) {}
