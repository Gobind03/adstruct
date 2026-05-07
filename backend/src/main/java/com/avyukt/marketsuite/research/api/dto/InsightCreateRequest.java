package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record InsightCreateRequest(
        @NotBlank String category,
        @NotBlank String insightType,
        @NotBlank String title,
        String summary,
        Map<String, Object> detailsJson,
        String confidence,
        UUID competitorId,
        List<String> relatedKeywords,
        List<String> relatedTopics,
        String language) {}
