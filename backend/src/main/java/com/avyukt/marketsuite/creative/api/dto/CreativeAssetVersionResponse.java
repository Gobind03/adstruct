package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CreativeAssetVersionResponse(
    UUID id,
    UUID assetId,
    Integer versionNumber,
    String versionType,
    String changeNotes,
    String fileUrl,
    String checksum,
    Integer width,
    Integer height,
    Integer durationSeconds,
    Long sizeBytes,
    String metaJson,
    UUID createdByUserId,
    String createdAt
) {}
