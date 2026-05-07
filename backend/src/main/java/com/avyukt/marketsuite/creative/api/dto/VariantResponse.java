package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record VariantResponse(
    UUID id,
    UUID variantSetId,
    Integer variantIndex,
    String entityType,
    UUID entityId,
    String score,
    String notes,
    String createdAt
) {}
