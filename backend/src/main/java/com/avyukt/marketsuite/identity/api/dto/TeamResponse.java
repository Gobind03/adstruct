package com.avyukt.marketsuite.identity.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TeamResponse(
        UUID id,
        UUID orgId,
        UUID workspaceId,
        String name,
        List<TeamMemberResponse> members,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
