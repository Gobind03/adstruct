package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record VariantSetResponse(
    UUID id,
    UUID workspaceId,
    String name,
    String parentEntityType,
    UUID parentEntityId,
    String strategy,
    String parametersJson,
    UUID createdByUserId,
    String createdAt,
    String updatedAt
) {}
