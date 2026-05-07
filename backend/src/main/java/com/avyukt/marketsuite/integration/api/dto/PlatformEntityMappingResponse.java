package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PlatformEntityMappingResponse(
        UUID id,
        UUID workspaceId,
        UUID integrationAccountId,
        UUID resourceId,
        String internalEntityType,
        UUID internalEntityId,
        String externalEntityType,
        String externalEntityId,
        String externalParentId,
        String mappingStatus,
        String metaJson,
        OffsetDateTime createdAt) {}
