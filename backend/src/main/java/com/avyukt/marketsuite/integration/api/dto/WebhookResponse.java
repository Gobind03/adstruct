package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WebhookResponse(
        UUID id,
        UUID integrationAccountId,
        String status,
        String endpointUrl,
        String signingSecret,
        String subscribedEventsJson,
        OffsetDateTime lastReceivedAt,
        String errorMessage,
        OffsetDateTime createdAt) {}
