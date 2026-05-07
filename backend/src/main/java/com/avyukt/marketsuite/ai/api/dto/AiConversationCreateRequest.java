package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiConversationCreateRequest(
        @NotNull String title,
        String agentMode,
        UUID providerConfigId,
        String model,
        String contextJson) {}
