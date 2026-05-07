package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record GenerateVideoScriptRequest(
    @NotBlank String product,
    String offer,
    Integer durationSeconds,
    String platformType,
    @NotBlank String language,
    UUID personaResearchId
) {}
