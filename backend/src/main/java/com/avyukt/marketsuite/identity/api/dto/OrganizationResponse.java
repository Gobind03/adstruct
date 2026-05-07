package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.OrgStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrganizationResponse(
        UUID id,
        String name,
        String timezone,
        String currency,
        OrgStatus status,
        long workspaceCount,
        long memberCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
