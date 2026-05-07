package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.PacingMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CampaignCreateRequest(
        @NotNull(message = "Workspace ID is required") UUID workspaceId,
        @NotNull(message = "Integration account ID is required") UUID integrationAccountId,
        @NotBlank(message = "Campaign name is required") String name,
        @NotNull(message = "Objective is required") CampaignObjective objective,
        BigDecimal dailyBudget,
        BigDecimal lifetimeBudget,
        LocalDate startDate,
        LocalDate endDate,
        PacingMode pacingMode
) {}
