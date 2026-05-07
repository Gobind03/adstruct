package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceBrandOverridesRequest(@NotBlank String overridesJson) {}
