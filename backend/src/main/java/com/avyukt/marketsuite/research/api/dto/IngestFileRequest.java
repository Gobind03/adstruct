package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

public record IngestFileRequest(
        @NotBlank String title,
        @NotBlank String fileUrl,
        @NotBlank String snapshotType,
        UUID competitorId,
        String summaryText,
        Map<String, Object> metaJson) {}
