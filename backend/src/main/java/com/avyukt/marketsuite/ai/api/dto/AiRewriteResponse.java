package com.avyukt.marketsuite.ai.api.dto;

import java.util.UUID;

public record AiRewriteResponse(String originalText, String rewrittenText, UUID runId) {}
