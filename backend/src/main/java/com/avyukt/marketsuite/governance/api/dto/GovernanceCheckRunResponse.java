package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record GovernanceCheckRunResponse(
        UUID id,
        UUID workspaceId,
        String entityType,
        UUID entityId,
        UUID ruleSetId,
        String platformType,
        String language,
        String status,
        String findingsJson,
        UUID createdByUserId,
        OffsetDateTime createdAt) {}
