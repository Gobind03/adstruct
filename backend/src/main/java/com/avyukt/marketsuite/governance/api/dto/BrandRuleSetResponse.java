package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BrandRuleSetResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String name,
        String domain,
        String description,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
