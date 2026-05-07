package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class PinterestAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(PinterestAdsConnector.class);
    private static final String BASE_URL = "https://api.pinterest.com/v5";
    private final PlatformRestClient client;

    public PinterestAdsConnector(PlatformRestClient client) {
        this.client = client;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.PINTEREST;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/user_account", accessToken);
            if (resp.has("username")) {
                return ValidationResult.success();
            }
            return ValidationResult.failure("Pinterest validation failed");
        } catch (PlatformApiException e) {
            return ValidationResult.failure("Pinterest API validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/ad_accounts", accessToken);
            JsonNode items = resp.path("items");
            if (items.isArray()) {
                for (JsonNode item : items) {
                    resources.add(new DiscoveredResource(
                            ResourceType.AD_ACCOUNT,
                            item.path("id").asText(),
                            item.path("name").asText("Pinterest Ad Account"),
                            Map.of("currency", item.path("currency").asText(""))));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Pinterest resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String url = String.format(
                    "%s/ad_accounts/%s/analytics?start_date=%s&end_date=%s"
                            + "&columns=SPEND_IN_DOLLAR,IMPRESSION,CLICKTHROUGH_1,TOTAL_CONVERSIONS"
                            + "&granularity=DAY&level=CAMPAIGN",
                    BASE_URL,
                    request.adAccountId(),
                    request.startDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    request.endDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            JsonNode resp = client.getWithBearer(url, accessToken);
            if (resp.isArray()) {
                for (JsonNode row : resp) {
                    BigDecimal spend = parseBd(row, "SPEND_IN_DOLLAR");
                    long impressions = row.path("IMPRESSION").asLong();
                    long clicks = row.path("CLICKTHROUGH_1").asLong();
                    BigDecimal cpc = clicks > 0 ? spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    BigDecimal cpm = impressions > 0
                            ? spend.multiply(BigDecimal.valueOf(1000)).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    BigDecimal ctr = impressions > 0
                            ? BigDecimal.valueOf(clicks * 100).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    rows.add(new CampaignReportRow(
                            row.path("CAMPAIGN_ID").asText(""),
                            "Pinterest Campaign",
                            "ACTIVE",
                            spend,
                            impressions,
                            clicks,
                            cpc,
                            cpm,
                            ctr,
                            row.path("TOTAL_CONVERSIONS").asLong(),
                            java.time.LocalDate.parse(row.path("DATE").asText(request.startDate().toString()))));
                }
            }
        } catch (Exception e) {
            log.warn("Pinterest campaign report fetch failed: {}", e.getMessage());
        }
        return rows;
    }

    private BigDecimal parseBd(JsonNode node, String field) {
        try {
            return new BigDecimal(node.path(field).asText("0")).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
