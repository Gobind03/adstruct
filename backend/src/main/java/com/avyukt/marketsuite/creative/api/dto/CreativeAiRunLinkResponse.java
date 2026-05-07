package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CreativeAiRunLinkResponse(
    UUID id,
    UUID workspaceId,
    UUID aiPromptRunId,
    UUID aiConversationId,
    UUID aiMessageId,
    String producedEntityType,
    UUID producedEntityId,
    String inputContextJson,
    String citationsJson,
    UUID createdByUserId,
    String createdAt
) {}
