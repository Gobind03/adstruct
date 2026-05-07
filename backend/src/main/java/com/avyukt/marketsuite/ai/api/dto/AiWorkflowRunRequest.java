package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AiWorkflowRunRequest(@NotNull String inputJson, UUID conversationId) {}
