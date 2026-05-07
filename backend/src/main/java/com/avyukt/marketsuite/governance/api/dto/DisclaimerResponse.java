package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DisclaimerResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String key,
        String title,
        String defaultText,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
