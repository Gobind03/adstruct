package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

public record AiMessageCreateRequest(@NotNull String content) {}
