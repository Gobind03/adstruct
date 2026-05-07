package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;

public record GenerateUgcBriefRequest(
    @NotBlank String product,
    String deliverables,
    @NotBlank String language,
    String toneOverride
) {}
