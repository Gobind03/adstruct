package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record IntegrationAccountResponse(
        UUID id,
        UUID orgId,
        String platformType,
        String category,
        String displayName,
        String status,
        String authType,
        String scopesJson,
        String externalAccountId,
        UUID connectedByUserId,
        OffsetDateTime lastValidatedAt,
        OffsetDateTime lastSyncAt,
        String errorCode,
        String errorMessage,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
