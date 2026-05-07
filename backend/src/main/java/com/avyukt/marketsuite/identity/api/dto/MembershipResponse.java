package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipResponse(
        UUID id, UUID userId, UUID orgId, UUID workspaceId, MemberRole role, OffsetDateTime createdAt) {}
