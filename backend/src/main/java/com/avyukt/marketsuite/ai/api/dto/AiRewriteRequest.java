package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

public record AiRewriteRequest(
        @NotNull String text,
        String platformType,
        String language) {}
