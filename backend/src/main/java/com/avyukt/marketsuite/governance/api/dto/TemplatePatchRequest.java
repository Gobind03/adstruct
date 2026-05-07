package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Size;

public record TemplatePatchRequest(
        @Size(max = 160) String name,
        String description,
        String contentJson,
        String tags,
        String ruleSetId,
        String defaultDisclaimerIds) {}
