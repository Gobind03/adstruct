package com.avyukt.marketsuite.integration.service.connectors;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CampaignReportRow(
        String externalCampaignId,
        String campaignName,
        String status,
        BigDecimal spend,
        long impressions,
        long clicks,
        BigDecimal cpc,
        BigDecimal cpm,
        BigDecimal ctr,
        long conversions,
        LocalDate date) {}
