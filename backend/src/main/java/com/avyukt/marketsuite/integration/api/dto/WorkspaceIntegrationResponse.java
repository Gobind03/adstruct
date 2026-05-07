package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WorkspaceIntegrationResponse(
        UUID id,
        UUID workspaceId,
        UUID integrationAccountId,
        String platformType,
        String accountDisplayName,
        UUID integrationResourceId,
        String resourceDisplayName,
        boolean enabled,
        boolean isDefault,
        String settingsJson,
        OffsetDateTime createdAt) {}
