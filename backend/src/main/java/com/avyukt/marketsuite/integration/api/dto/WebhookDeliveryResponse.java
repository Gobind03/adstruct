package com.avyukt.marketsuite.integration.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WebhookDeliveryResponse(
        UUID id,
        UUID webhookId,
        String platformType,
        String eventType,
        String status,
        int rowsProcessed,
        String errorMessage,
        OffsetDateTime receivedAt) {}
