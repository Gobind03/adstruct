package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreativeUsageRequest(
    @NotBlank String usedEntityType,
    @NotNull UUID usedEntityId,
    @NotBlank String creativeEntityType,
    @NotNull UUID creativeEntityId,
    String relationType,
    String contextJson
) {}
