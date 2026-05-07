package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CreativeUsageResponse(
    UUID id,
    UUID workspaceId,
    String usedEntityType,
    UUID usedEntityId,
    String creativeEntityType,
    UUID creativeEntityId,
    String relationType,
    String contextJson,
    UUID createdByUserId,
    String createdAt
) {}
