package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CopyArtifactCreateRequest(
    @NotBlank String name,
    @NotNull String type,
    @NotBlank String contentText,
    String language,
    String format,
    String contentJson,
    UUID templateId,
    UUID ruleSetId,
    String disclaimerIds
) {}
