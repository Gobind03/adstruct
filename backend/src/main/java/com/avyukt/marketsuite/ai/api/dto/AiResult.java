package com.avyukt.marketsuite.ai.api.dto;

import java.util.List;
import java.util.UUID;

public record AiResult(
        String outputText,
        String outputJson,
        List<AiCitationResponse> citations,
        UUID runId) {}
