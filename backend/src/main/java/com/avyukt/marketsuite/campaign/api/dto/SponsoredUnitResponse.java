package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.UnitStatus;
import com.avyukt.marketsuite.campaign.domain.UnitType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SponsoredUnitResponse(
        UUID id,
        UUID campaignId,
        UnitType type,
        String title,
        String snippet,
        String ctaText,
        String landingUrl,
        String disclaimer,
        UnitStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
