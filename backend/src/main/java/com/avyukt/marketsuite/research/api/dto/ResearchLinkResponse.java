package com.avyukt.marketsuite.research.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ResearchLinkResponse(
        UUID id,
        UUID workspaceId,
        String researchEntityType,
        UUID researchEntityId,
        String linkedEntityType,
        UUID linkedEntityId,
        String relationType,
        String note,
        UUID createdByUserId,
        OffsetDateTime createdAt) {}
