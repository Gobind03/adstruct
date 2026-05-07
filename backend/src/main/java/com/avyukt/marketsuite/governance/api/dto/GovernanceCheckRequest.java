package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record GovernanceCheckRequest(
        @NotBlank String entityType,
        @NotNull UUID entityId,
        @NotBlank String contentPayloadJson,
        String ruleSetId,
        String platformType,
        String language) {}
