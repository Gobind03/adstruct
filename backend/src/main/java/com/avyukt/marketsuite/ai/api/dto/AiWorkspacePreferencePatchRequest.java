package com.avyukt.marketsuite.ai.api.dto;

public record AiWorkspacePreferencePatchRequest(
        Boolean isDefault,
        String allowedModels,
        String policyJson) {}
