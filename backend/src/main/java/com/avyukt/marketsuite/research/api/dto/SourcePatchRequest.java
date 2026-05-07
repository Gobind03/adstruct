package com.avyukt.marketsuite.research.api.dto;

import java.util.Map;
import java.util.UUID;

public record SourcePatchRequest(
        String title,
        String url,
        UUID competitorId,
        String noteText,
        Map<String, Object> metaJson) {}
