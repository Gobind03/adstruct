package com.avyukt.marketsuite.ai.service.gateway;

import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.avyukt.marketsuite.ai.domain.LlmProviderType;
import java.util.List;
import java.util.Map;

public record LlmRequest(
        LlmProviderType providerType,
        String model,
        LlmCallPurpose purpose,
        List<LlmMessage> messages,
        double temperature,
        int maxTokens,
        Map<String, String> metadata) {}
