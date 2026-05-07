package com.avyukt.marketsuite.research.service;

import java.util.Map;
import java.util.UUID;

/**
 * Normalized ingest payload built from URL/file DTOs plus {@code workspaceId} from the path.
 */
public record IngestRequest(
        UUID workspaceId,
        String title,
        String urlOrFileUrl,
        String snapshotType,
        UUID competitorId,
        String rawText,
        String summaryText,
        Map<String, Object> metaJson,
        boolean fileIngest) {}
