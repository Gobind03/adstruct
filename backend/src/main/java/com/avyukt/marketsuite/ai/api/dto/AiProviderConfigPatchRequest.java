package com.avyukt.marketsuite.ai.api.dto;

public record AiProviderConfigPatchRequest(
        String defaultModel,
        String endpointBaseUrl,
        Integer requestTimeoutMs,
        Integer maxTokens,
        Double temperature,
        Boolean enabled) {}
