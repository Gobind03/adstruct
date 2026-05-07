package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiWorkspacePreferenceResponse(
        UUID id,
        UUID workspaceId,
        UUID providerConfigId,
        String providerType,
        String defaultModel,
        boolean isDefault,
        String allowedModels,
        String policyJson,
        OffsetDateTime createdAt) {}
