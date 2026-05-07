package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BrandRuleResponse(
        UUID id,
        UUID ruleSetId,
        String ruleType,
        String severity,
        String name,
        String description,
        String pattern,
        String parametersJson,
        String appliesToJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
