package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DisclaimerLocalizationRequest(@NotBlank @Size(max = 12) String language, @NotBlank String text) {}
