package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DisclaimerLocalizationResponse(
        UUID id, UUID disclaimerId, String language, String text, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}
