package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

public record AiRedactionRuleCreateRequest(
        @NotNull String name,
        @NotNull String pattern,
        String replacement,
        Boolean enabled) {}
