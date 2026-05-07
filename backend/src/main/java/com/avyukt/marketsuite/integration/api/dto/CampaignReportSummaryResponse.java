package com.avyukt.marketsuite.integration.api.dto;

import java.math.BigDecimal;

public record CampaignReportSummaryResponse(
        BigDecimal totalSpend,
        long totalImpressions,
        long totalClicks,
        long totalConversions,
        long campaignCount,
        BigDecimal avgCpc,
        BigDecimal avgCtr) {}
