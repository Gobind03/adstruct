package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.CampaignStatus;
import com.avyukt.marketsuite.campaign.domain.PacingMode;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CampaignResponse(
        UUID id,
        UUID workspaceId,
        UUID integrationAccountId,
        String name,
        CampaignObjective objective,
        CampaignStatus status,
        BigDecimal dailyBudget,
        BigDecimal lifetimeBudget,
        LocalDate startDate,
        LocalDate endDate,
        PacingMode pacingMode,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
