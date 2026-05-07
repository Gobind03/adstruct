package com.avyukt.marketsuite.research.service.connectors;

import java.util.Map;
import java.util.UUID;

public record IngestRequest(
        UUID workspaceId,
        String title,
        String url,
        String fileUrl,
        String snapshotType,
        UUID competitorId,
        String rawText,
        String summaryText,
        Map<String, Object> metaJson) {}
