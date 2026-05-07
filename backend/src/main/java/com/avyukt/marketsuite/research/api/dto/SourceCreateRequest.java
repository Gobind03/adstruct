package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

public record SourceCreateRequest(
        @NotBlank String sourceType,
        @NotBlank String title,
        String url,
        UUID competitorId,
        UUID integrationAccountId,
        UUID integrationResourceId,
        String fileUrl,
        String noteText,
        Map<String, Object> metaJson) {}
