package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record GenerateCopyRequest(
    @NotBlank String name,
    @NotNull String copyArtifactType,
    UUID templateId,
    UUID ruleSetId,
    String disclaimerIds,
    UUID personaResearchId,
    UUID keywordClusterId,
    String insightIds,
    String platformType,
    @NotBlank String language,
    String toneOverride,
    Integer numVariants
) {}
