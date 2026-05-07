package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;

public record HandleCreateRequest(
        @NotBlank String platformType,
        @NotBlank String handle,
        String url) {}
