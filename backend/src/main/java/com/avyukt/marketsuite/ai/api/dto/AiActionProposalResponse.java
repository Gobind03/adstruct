package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AiActionProposalResponse(
        UUID id,
        UUID workspaceId,
        UUID conversationId,
        String title,
        String description,
        String actionType,
        String targetEntityType,
        UUID targetEntityId,
        String payloadJson,
        String status,
        UUID requestedByUserId,
        UUID reviewedByUserId,
        String reviewNotes,
        OffsetDateTime executedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
