package com.avyukt.marketsuite.ai.api.dto;

public record AiPromptPatchRequest(
        String name,
        String description,
        String purpose,
        String outputFormat,
        String systemPrompt,
        String userPromptTemplate,
        String guardrailsText,
        String tags) {}
