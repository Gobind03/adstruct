package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TemplateUsageResponse(
        UUID id,
        UUID templateId,
        UUID workspaceId,
        String usedInEntityType,
        UUID usedInEntityId,
        UUID usedByUserId,
        OffsetDateTime usedAt) {}
