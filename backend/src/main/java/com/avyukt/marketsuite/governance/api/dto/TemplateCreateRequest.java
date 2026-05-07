package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TemplateCreateRequest(
        @NotBlank String scope,
        String workspaceId,
        @NotBlank String templateType,
        @NotBlank @Size(max = 160) String name,
        String description,
        @NotBlank String contentJson,
        String tags,
        String ruleSetId,
        String defaultDisclaimerIds) {}
