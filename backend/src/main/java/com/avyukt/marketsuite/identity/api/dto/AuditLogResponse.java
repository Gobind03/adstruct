package com.avyukt.marketsuite.identity.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID orgId,
        UUID workspaceId,
        UUID actorUserId,
        String action,
        String entityType,
        UUID entityId,
        String beforeJson,
        String afterJson,
        OffsetDateTime createdAt) {}
