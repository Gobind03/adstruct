package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BrandAssetResponse(
        UUID id,
        String scope,
        UUID orgId,
        UUID workspaceId,
        String name,
        String assetType,
        String fileUrl,
        String checksum,
        Integer width,
        Integer height,
        String mimeType,
        String tags,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
