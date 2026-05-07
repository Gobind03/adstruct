package com.avyukt.marketsuite.ai.api.dto;

import java.util.List;

public record PostMessageResponse(
        AiMessageResponse assistantMessage,
        List<AiToolCallResponse> toolCalls,
        List<AiCitationResponse> citations) {}
