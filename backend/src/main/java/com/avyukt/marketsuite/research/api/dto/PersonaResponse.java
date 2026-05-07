package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record PersonaResponse(
        UUID id,
        UUID workspaceId,
        String name,
        List<String> pains,
        List<String> objections,
        List<String> motivations,
        List<String> channels,
        String language,
        String sentiment,
        UUID sourceSnapshotId,
        UUID createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
