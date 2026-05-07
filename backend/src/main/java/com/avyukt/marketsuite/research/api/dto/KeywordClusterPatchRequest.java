package com.avyukt.marketsuite.research.api.dto;

import java.util.List;
import java.util.Map;

public record KeywordClusterPatchRequest(
        String name,
        String intentType,
        List<String> keywords,
        Map<String, Object> metricsJson) {}
