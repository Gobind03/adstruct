package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BrandAssetCreateRequest(
        @NotBlank String scope,
        String workspaceId,
        @NotBlank @Size(max = 140) String name,
        @NotBlank @Size(max = 40) String assetType,
        @NotBlank @Size(max = 500) String fileUrl,
        String checksum,
        Integer width,
        Integer height,
        String mimeType,
        String tags) {}
