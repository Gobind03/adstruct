package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LinkedInAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(LinkedInAdsConnector.class);
    private static final String BASE_URL = "https://api.linkedin.com";
    private final PlatformRestClient client;

    public LinkedInAdsConnector(PlatformRestClient client) {
        this.client = client;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.LINKEDIN;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithBearerAndHeaders(
                    BASE_URL + "/rest/me", accessToken, Map.of("LinkedIn-Version", "202401", "X-Restli-Protocol-Version", "2.0.0"));
            if (resp.has("id")) {
                return ValidationResult.success();
            }
            return ValidationResult.failure("LinkedIn validation failed");
        } catch (PlatformApiException e) {
            return ValidationResult.failure("LinkedIn API validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode resp = client.getWithBearerAndHeaders(
                    BASE_URL + "/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))",
                    accessToken,
                    Map.of("LinkedIn-Version", "202401", "X-Restli-Protocol-Version", "2.0.0"));
            JsonNode elements = resp.path("elements");
            if (elements.isArray()) {
                for (JsonNode elem : elements) {
                    String accountId = elem.path("id").asText();
                    resources.add(new DiscoveredResource(
                            ResourceType.AD_ACCOUNT,
                            accountId,
                            elem.path("name").asText("LinkedIn Ad Account " + accountId),
                            Map.of("status", elem.path("status").asText())));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("LinkedIn resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String url = String.format(
                    "%s/rest/adAnalytics?q=analytics&pivot=CAMPAIGN"
                            + "&dateRange=(start:(year:%d,month:%d,day:%d),end:(year:%d,month:%d,day:%d))"
                            + "&accounts=List(urn%%3Ali%%3AsponsoredAccount%%3A%s)"
                            + "&fields=impressions,clicks,costInLocalCurrency,externalWebsiteConversions",
                    BASE_URL,
                    request.startDate().getYear(),
                    request.startDate().getMonthValue(),
                    request.startDate().getDayOfMonth(),
                    request.endDate().getYear(),
                    request.endDate().getMonthValue(),
                    request.endDate().getDayOfMonth(),
                    request.adAccountId());
            JsonNode resp = client.getWithBearerAndHeaders(
                    url, accessToken, Map.of("LinkedIn-Version", "202401", "X-Restli-Protocol-Version", "2.0.0"));
            JsonNode elements = resp.path("elements");
            if (elements.isArray()) {
                for (JsonNode elem : elements) {
                    String pivotValue = elem.path("pivotValue").asText("");
                    String campaignId = pivotValue.contains(":") ? pivotValue.substring(pivotValue.lastIndexOf(':') + 1) : pivotValue;
                    long impressions = elem.path("impressions").asLong();
                    long clicks = elem.path("clicks").asLong();
                    BigDecimal spend = parseBd(elem, "costInLocalCurrency");
                    BigDecimal cpc = clicks > 0 ? spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    BigDecimal cpm = impressions > 0
                            ? spend.multiply(BigDecimal.valueOf(1000)).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    BigDecimal ctr = impressions > 0
                            ? BigDecimal.valueOf(clicks * 100).divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;
                    rows.add(new CampaignReportRow(
                            campaignId,
                            "LinkedIn Campaign " + campaignId,
                            "ACTIVE",
                            spend,
                            impressions,
                            clicks,
                            cpc,
                            cpm,
                            ctr,
                            elem.path("externalWebsiteConversions").asLong(),
                            request.startDate()));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("LinkedIn campaign report fetch failed: {}", e.getMessage());
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
