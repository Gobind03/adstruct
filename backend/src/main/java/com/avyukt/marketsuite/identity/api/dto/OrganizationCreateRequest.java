package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotBlank;

public record OrganizationCreateRequest(
        @NotBlank(message = "Name is required") String name,
        String timezone,
        String currency
) {}
