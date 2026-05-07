package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BrandRuleSetCreateRequest(
        @NotBlank String scope,
        String workspaceId,
        @NotBlank @Size(max = 160) String name,
        String domain,
        String description) {}
