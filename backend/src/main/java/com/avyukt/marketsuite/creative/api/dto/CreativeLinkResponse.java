package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CreativeLinkResponse(
    UUID id,
    UUID workspaceId,
    String fromEntityType,
    UUID fromEntityId,
    String toEntityType,
    UUID toEntityId,
    String relationType,
    String note,
    UUID createdByUserId,
    String createdAt
) {}
