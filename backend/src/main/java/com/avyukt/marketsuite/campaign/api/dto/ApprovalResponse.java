package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.ApprovalState;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ApprovalResponse(
        UUID id,
        String entityType,
        UUID entityId,
        ApprovalState state,
        UUID reviewerUserId,
        String notes,
        OffsetDateTime updatedAt
) {}
