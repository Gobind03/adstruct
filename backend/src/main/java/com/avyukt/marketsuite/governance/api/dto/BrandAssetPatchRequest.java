package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Size;

public record BrandAssetPatchRequest(
        @Size(max = 140) String name, String assetType, String tags, String status) {}
