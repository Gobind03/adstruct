package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiProviderConfigCreateRequest(
        UUID integrationAccountId,
        @NotNull String providerType,
        @NotBlank String defaultModel,
        String endpointBaseUrl,
        Integer maxTokens,
        Integer requestTimeoutMs,
        Double temperature,
        Boolean enabled,
        String apiKey,
        String displayName) {}
