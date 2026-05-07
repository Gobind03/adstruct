package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PlatformConstraintResponse(
        UUID id,
        String platformType,
        String constraintType,
        String valueJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
