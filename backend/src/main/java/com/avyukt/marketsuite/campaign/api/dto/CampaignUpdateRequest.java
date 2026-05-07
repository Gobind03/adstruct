package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.PacingMode;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CampaignUpdateRequest(
        String name,
        CampaignObjective objective,
        BigDecimal dailyBudget,
        BigDecimal lifetimeBudget,
        LocalDate startDate,
        LocalDate endDate,
        PacingMode pacingMode
) {}
