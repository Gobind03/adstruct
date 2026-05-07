package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotNull;

public record RenderPresetCreateRequest(
    @NotNull String preset,
    String constraintsJson
) {}
