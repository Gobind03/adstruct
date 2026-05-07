package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record IntegrationResourceResponse(
        UUID id,
        UUID integrationAccountId,
        String resourceType,
        String externalResourceId,
        String displayName,
        String status,
        String metaJson,
        OffsetDateTime lastDiscoveredAt,
        OffsetDateTime createdAt) {}
