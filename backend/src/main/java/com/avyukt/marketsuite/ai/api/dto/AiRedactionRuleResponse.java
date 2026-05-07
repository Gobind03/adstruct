package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiRedactionRuleResponse(
        UUID id,
        UUID workspaceId,
        String name,
        String pattern,
        String replacement,
        boolean enabled,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
