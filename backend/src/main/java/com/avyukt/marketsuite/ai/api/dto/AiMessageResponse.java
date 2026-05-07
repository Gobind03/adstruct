package com.avyukt.marketsuite.ai.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AiMessageResponse(
        UUID id,
        UUID conversationId,
        String role,
        String content,
        String contentJson,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        List<AiCitationResponse> citations) {}
