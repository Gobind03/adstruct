package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record VariantCreateRequest(
    @NotBlank String entityType,
    @NotNull UUID entityId,
    String notes
) {}
