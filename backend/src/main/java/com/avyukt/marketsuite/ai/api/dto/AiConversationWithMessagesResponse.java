package com.avyukt.marketsuite.ai.api.dto;

import java.util.List;

public record AiConversationWithMessagesResponse(
        AiConversationResponse conversation, List<AiMessageResponse> messages) {}
