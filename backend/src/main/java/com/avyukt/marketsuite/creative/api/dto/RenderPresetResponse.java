package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record RenderPresetResponse(
    UUID id,
    UUID workspaceId,
    String preset,
    String constraintsJson,
    String createdAt,
    String updatedAt
) {}
