package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotBlank;

public record WorkspaceCreateRequest(
        @NotBlank(message = "Name is required") String name,
        String market
) {}
