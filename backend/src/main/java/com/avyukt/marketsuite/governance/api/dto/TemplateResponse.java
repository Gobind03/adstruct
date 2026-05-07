package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TemplateResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String templateType,
        String name,
        String description,
        String status,
        String contentJson,
        String tags,
        Integer version,
        UUID parentTemplateId,
        UUID ruleSetId,
        String defaultDisclaimerIds,
        UUID createdByUserId,
        UUID updatedByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
