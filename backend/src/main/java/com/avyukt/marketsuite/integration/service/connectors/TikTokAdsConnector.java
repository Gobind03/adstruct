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
public class TikTokAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(TikTokAdsConnector.class);
    private static final String BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
    private final PlatformRestClient client;

    public TikTokAdsConnector(PlatformRestClient client) {
        this.client = client;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.TIKTOK;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithHeader(BASE_URL + "/user/info/", "Access-Token", accessToken);
            if (resp.path("code").asInt() == 0) {
                return ValidationResult.success();
            }
            return ValidationResult.failure(resp.path("message").asText("TikTok validation failed"));
        } catch (PlatformApiException e) {
            return ValidationResult.failure("TikTok API validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode resp = client.getWithHeader(
                    BASE_URL + "/advertiser/get/?app_id=" + externalAccountId, "Access-Token", accessToken);
            JsonNode data = resp.path("data").path("list");
            if (data.isArray()) {
                for (JsonNode adv : data) {
                    resources.add(new DiscoveredResource(
                            ResourceType.AD_ACCOUNT,
                            adv.path("advertiser_id").asText(),
                            adv.path("advertiser_name").asText("TikTok Advertiser"),
                            Map.of("status", adv.path("status").asText())));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("TikTok resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String url = String.format(
                    "%s/report/integrated/get/?advertiser_id=%s"
                            + "&report_type=BASIC&dimensions=[\"campaign_id\"]"
                            + "&metrics=[\"spend\",\"impressions\",\"clicks\",\"cpc\",\"cpm\",\"ctr\",\"conversion\"]"
                            + "&data_level=AUCTION_CAMPAIGN"
                            + "&start_date=%s&end_date=%s&page_size=100",
                    BASE_URL,
                    request.adAccountId(),
                    request.startDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    request.endDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            JsonNode resp = client.getWithHeader(url, "Access-Token", accessToken);
            JsonNode list = resp.path("data").path("list");
            if (list.isArray()) {
                for (JsonNode item : list) {
                    JsonNode dims = item.path("dimensions");
                    JsonNode metrics = item.path("metrics");
                    rows.add(new CampaignReportRow(
                            dims.path("campaign_id").asText(),
                            dims.path("campaign_name").asText(""),
                            "ACTIVE",
                            parseBd(metrics, "spend"),
                            metrics.path("impressions").asLong(),
                            metrics.path("clicks").asLong(),
                            parseBd(metrics, "cpc"),
                            parseBd(metrics, "cpm"),
                            parseBd(metrics, "ctr"),
                            metrics.path("conversion").asLong(),
                            request.startDate()));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("TikTok campaign report fetch failed: {}", e.getMessage());
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
