package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreativeAssetVersionRequest(
    String versionType,
    String changeNotes,
    @NotBlank String fileUrl,
    String checksum,
    Integer width,
    Integer height,
    Integer durationSeconds,
    Long sizeBytes,
    String metaJson
) {}
