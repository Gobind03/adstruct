package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BrandRuleCreateRequest(
        @NotBlank String ruleType,
        @NotBlank String severity,
        @NotBlank @Size(max = 160) String name,
        String description,
        @Size(max = 500) String pattern,
        String parametersJson,
        String appliesToJson) {}
