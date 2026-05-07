package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record KeywordClusterCreateRequest(
        @NotBlank String name,
        String intentType,
        List<String> keywords,
        Map<String, Object> metricsJson,
        UUID sourceSnapshotId) {}
