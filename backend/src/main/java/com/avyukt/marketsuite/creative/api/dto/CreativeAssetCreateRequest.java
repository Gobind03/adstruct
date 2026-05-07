package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreativeAssetCreateRequest(
    @NotBlank String name,
    @NotNull String assetType,
    @NotBlank String sourceUrl,
    String fileUrl,
    String description,
    String visibility,
    String mimeType,
    Integer width,
    Integer height,
    Integer durationSeconds,
    Long sizeBytes,
    String tags,
    String metaJson
) {}
