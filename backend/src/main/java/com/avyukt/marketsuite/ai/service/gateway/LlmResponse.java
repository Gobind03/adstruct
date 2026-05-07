package com.avyukt.marketsuite.ai.service.gateway;

import java.util.Map;

public record LlmResponse(
        String text,
        String json,
        Map<String, Object> tokenUsage,
        long latencyMs,
        Map<String, Object> rawProviderMeta) {}
