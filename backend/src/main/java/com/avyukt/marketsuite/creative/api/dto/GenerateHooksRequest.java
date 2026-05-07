package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record GenerateHooksRequest(
    @NotBlank String topic,
    UUID personaResearchId,
    String insightIds,
    @NotBlank String language
) {}
