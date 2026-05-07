package com.avyukt.marketsuite.ai.api.dto;

import java.util.UUID;

public record AiToolDefinitionResponse(
        UUID id,
        String name,
        String description,
        String riskLevel,
        String inputSchemaJson,
        String outputSchemaJson,
        boolean enabled) {}
