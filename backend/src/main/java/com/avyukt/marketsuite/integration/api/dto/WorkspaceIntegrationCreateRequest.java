package com.avyukt.marketsuite.integration.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record WorkspaceIntegrationCreateRequest(
        @NotNull(message = "Account ID is required") UUID accountId,
        UUID resourceId,
        boolean enabled,
        boolean isDefault,
        String settingsJson) {}
