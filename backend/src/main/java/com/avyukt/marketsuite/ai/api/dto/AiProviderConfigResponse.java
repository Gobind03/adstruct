package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiProviderConfigResponse(
        UUID id,
        UUID orgId,
        UUID integrationAccountId,
        String providerType,
        String defaultModel,
        String endpointBaseUrl,
        int requestTimeoutMs,
        int maxTokens,
        double temperature,
        boolean enabled,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
