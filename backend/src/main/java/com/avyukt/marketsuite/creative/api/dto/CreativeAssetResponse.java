package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CreativeAssetResponse(
    UUID id,
    UUID workspaceId,
    UUID orgId,
    String assetType,
    String status,
    String visibility,
    String name,
    String description,
    String sourceType,
    String sourceUrl,
    String fileUrl,
    String mimeType,
    String checksum,
    Integer width,
    Integer height,
    Integer durationSeconds,
    Long sizeBytes,
    String tags,
    String metaJson,
    UUID createdByUserId,
    UUID updatedByUserId,
    String createdAt,
    String updatedAt
) {}
