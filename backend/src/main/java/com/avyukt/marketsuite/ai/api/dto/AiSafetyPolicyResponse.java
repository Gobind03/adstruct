package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiSafetyPolicyResponse(
        UUID id,
        UUID workspaceId,
        String policyJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
