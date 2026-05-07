package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.WorkspaceStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record WorkspaceResponse(
        UUID id, UUID orgId, String name, String market, WorkspaceStatus status, OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
