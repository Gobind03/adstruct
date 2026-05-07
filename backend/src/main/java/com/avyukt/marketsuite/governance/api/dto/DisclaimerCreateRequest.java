package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DisclaimerCreateRequest(
        @NotBlank String scope,
        String workspaceId,
        @NotBlank @Size(max = 80) String key,
        @NotBlank @Size(max = 160) String title,
        @NotBlank String defaultText) {}
