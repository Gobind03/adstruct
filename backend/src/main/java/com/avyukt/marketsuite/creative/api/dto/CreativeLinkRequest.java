package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreativeLinkRequest(
    @NotBlank String fromEntityType,
    @NotNull UUID fromEntityId,
    @NotBlank String toEntityType,
    @NotNull UUID toEntityId,
    @NotBlank String relationType,
    String note
) {}
