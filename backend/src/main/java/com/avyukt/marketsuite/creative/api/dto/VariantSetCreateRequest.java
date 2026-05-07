package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record VariantSetCreateRequest(
    @NotBlank String name,
    @NotBlank String parentEntityType,
    @NotNull UUID parentEntityId,
    @NotBlank String strategy,
    String parametersJson
) {}
