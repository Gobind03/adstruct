package com.avyukt.marketsuite.research.api.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record DigestReportResponse(
        UUID id,
        UUID workspaceId,
        String title,
        LocalDate periodStart,
        LocalDate periodEnd,
        String contentText,
        Map<String, Object> contentJson,
        UUID aiPromptRunId,
        UUID createdByUserId,
        OffsetDateTime createdAt) {}
