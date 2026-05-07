package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ResearchAiRunLinkResponse(
        UUID id,
        UUID workspaceId,
        UUID aiPromptRunId,
        UUID aiConversationId,
        UUID aiMessageId,
        String producedEntityType,
        UUID producedEntityId,
        List<UUID> snapshotIds,
        UUID createdByUserId,
        OffsetDateTime createdAt) {}
