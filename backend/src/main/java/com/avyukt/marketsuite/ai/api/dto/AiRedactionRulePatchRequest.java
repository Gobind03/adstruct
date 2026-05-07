package com.avyukt.marketsuite.ai.api.dto;

public record AiRedactionRulePatchRequest(
        String name,
        String pattern,
        String replacement,
        Boolean enabled) {}
