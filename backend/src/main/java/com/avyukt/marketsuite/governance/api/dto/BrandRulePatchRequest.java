package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Size;

public record BrandRulePatchRequest(
        String ruleType,
        String severity,
        @Size(max = 160) String name,
        String description,
        @Size(max = 500) String pattern,
        String parametersJson,
        String appliesToJson) {}
