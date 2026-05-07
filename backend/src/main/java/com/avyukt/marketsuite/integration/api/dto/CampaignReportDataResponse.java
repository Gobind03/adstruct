package com.avyukt.marketsuite.integration.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CampaignReportDataResponse(
        UUID id,
        UUID syncJobId,
        UUID integrationAccountId,
        String platformType,
        String accountDisplayName,
        UUID workspaceId,
        UUID internalCampaignId,
        String internalCampaignName,
        String externalCampaignId,
        String campaignName,
        String campaignStatus,
        BigDecimal spend,
        long impressions,
        long clicks,
        BigDecimal cpc,
        BigDecimal cpm,
        BigDecimal ctr,
        long conversions,
        LocalDate reportDate,
        OffsetDateTime createdAt) {}
