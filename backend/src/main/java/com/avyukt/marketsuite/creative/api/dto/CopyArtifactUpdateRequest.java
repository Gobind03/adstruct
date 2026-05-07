package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CopyArtifactUpdateRequest(
    String name,
    String contentText,
    String contentJson,
    String language,
    String format,
    UUID templateId,
    UUID ruleSetId,
    String disclaimerIds
) {}
