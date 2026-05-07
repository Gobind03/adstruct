package com.avyukt.marketsuite.research.api.dto;

import java.util.List;
import java.util.Map;

public record InsightPatchRequest(
        String title,
        String summary,
        Map<String, Object> detailsJson,
        String confidence,
        String status,
        List<String> relatedKeywords,
        List<String> relatedTopics,
        String language) {}
