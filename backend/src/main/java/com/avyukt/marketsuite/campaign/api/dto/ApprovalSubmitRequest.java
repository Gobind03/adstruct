package com.avyukt.marketsuite.campaign.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ApprovalSubmitRequest(
        @NotBlank(message = "Entity type is required") String entityType,
        @NotNull(message = "Entity ID is required") UUID entityId
) {}
