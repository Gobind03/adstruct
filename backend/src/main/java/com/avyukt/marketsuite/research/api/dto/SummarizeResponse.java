package com.avyukt.marketsuite.research.api.dto;

import java.util.List;
import java.util.UUID;

public record SummarizeResponse(
        UUID snapshotId,
        String summary,
        List<String> keyPoints,
        List<String> entities,
        String sentiment,
        UUID runId,
        UUID aiLinkId) {}
