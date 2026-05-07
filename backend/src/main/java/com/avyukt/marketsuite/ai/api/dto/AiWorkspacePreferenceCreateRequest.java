package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiWorkspacePreferenceCreateRequest(
        @NotNull UUID providerConfigId,
        Boolean isDefault,
        String allowedModels,
        String policyJson) {}
