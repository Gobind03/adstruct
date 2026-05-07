package com.avyukt.marketsuite.measurement.api.dto;

import java.time.LocalDate;
import java.util.UUID;

public record EventSummaryResponse(
        UUID campaignId,
        String eventType,
        long count,
        LocalDate date
) {}
