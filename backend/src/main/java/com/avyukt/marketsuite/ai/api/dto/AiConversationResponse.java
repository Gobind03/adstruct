package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiConversationResponse(
        UUID id,
        UUID workspaceId,
        String title,
        String status,
        String agentMode,
        UUID providerConfigId,
        String model,
        String contextJson,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
