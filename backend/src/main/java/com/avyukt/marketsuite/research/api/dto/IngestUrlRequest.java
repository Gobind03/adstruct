package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

public record IngestUrlRequest(
        @NotBlank String title,
        @NotBlank String url,
        String snapshotType,
        UUID competitorId,
        String rawText,
        String summaryText,
        Map<String, Object> metaJson) {}
