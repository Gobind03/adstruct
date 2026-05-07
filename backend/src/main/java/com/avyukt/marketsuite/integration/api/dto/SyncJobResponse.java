package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SyncJobResponse(
        UUID id,
        UUID integrationAccountId,
        UUID resourceId,
        UUID workspaceId,
        String syncMode,
        String status,
        OffsetDateTime startedAt,
        OffsetDateTime finishedAt,
        String statsJson,
        String errorMessage,
        UUID requestedByUserId,
        OffsetDateTime createdAt) {}
