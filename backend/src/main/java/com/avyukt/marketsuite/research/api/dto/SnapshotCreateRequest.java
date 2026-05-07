package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SnapshotCreateRequest(
        @NotBlank String snapshotType,
        @NotNull UUID sourceId,
        String title,
        String summaryText,
        String rawText,
        Map<String, Object> rawJson,
        String sentiment,
        List<String> tags) {}
