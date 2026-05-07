package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record CopyArtifactResponse(
    UUID id,
    UUID workspaceId,
    UUID orgId,
    String type,
    String status,
    String name,
    String language,
    String format,
    String contentText,
    String contentJson,
    UUID templateId,
    UUID ruleSetId,
    String disclaimerIds,
    UUID governanceCheckRunId,
    UUID createdByUserId,
    UUID updatedByUserId,
    String createdAt,
    String updatedAt
) {}
