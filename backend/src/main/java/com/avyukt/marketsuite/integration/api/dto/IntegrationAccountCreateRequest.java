package com.avyukt.marketsuite.integration.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record IntegrationAccountCreateRequest(
        @NotNull(message = "Platform type is required") String platformType,
        @NotBlank(message = "Display name is required") String displayName,
        @NotNull(message = "Auth type is required") String authType,
        Map<String, String> secretPayload,
        String scopesJson,
        String externalAccountId) {}
