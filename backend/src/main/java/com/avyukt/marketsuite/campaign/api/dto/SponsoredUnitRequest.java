package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.UnitType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SponsoredUnitRequest(
        @NotNull(message = "Unit type is required") UnitType type,
        @NotBlank(message = "Title is required") String title,
        String snippet,
        String ctaText,
        String landingUrl,
        String disclaimer
) {}
