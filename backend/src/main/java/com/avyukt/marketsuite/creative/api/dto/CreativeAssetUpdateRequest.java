package com.avyukt.marketsuite.creative.api.dto;

public record CreativeAssetUpdateRequest(
    String name,
    String description,
    String visibility,
    String tags,
    String metaJson,
    String status
) {}
