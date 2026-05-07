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
public class SnapchatAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(SnapchatAdsConnector.class);
    private static final String BASE_URL = "https://adsapi.snapchat.com/v1";
    private final PlatformRestClient client;

    public SnapchatAdsConnector(PlatformRestClient client) {
        this.client = client;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.SNAP;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/me", accessToken);
            if (resp.has("me")) {
                return ValidationResult.success();
            }
            return ValidationResult.failure("Snapchat validation failed");
        } catch (PlatformApiException e) {
            return ValidationResult.failure("Snapchat API validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode orgs = client.getWithBearer(BASE_URL + "/me/organizations", accessToken);
            JsonNode orgList = orgs.path("organizations");
            if (orgList.isArray()) {
                for (JsonNode org : orgList) {
                    String orgId = org.path("organization").path("id").asText();
                    JsonNode adAccounts =
                            client.getWithBearer(BASE_URL + "/organizations/" + orgId + "/adaccounts", accessToken);
                    JsonNode acctList = adAccounts.path("adaccounts");
                    if (acctList.isArray()) {
                        for (JsonNode acct : acctList) {
                            JsonNode inner = acct.path("adaccount");
                            resources.add(new DiscoveredResource(
                                    ResourceType.AD_ACCOUNT,
                                    inner.path("id").asText(),
                                    inner.path("name").asText("Snapchat Ad Account"),
                                    Map.of("organization_id", orgId)));
                        }
                    }
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Snapchat resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String url = String.format(
                    "%s/adaccounts/%s/stats?fields=impressions,swipes,spend&granularity=DAY"
                            + "&start_time=%sT00:00:00.000-00:00&end_time=%sT23:59:59.000-00:00&breakdown=campaign",
                    BASE_URL,
                    request.adAccountId(),
                    request.startDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    request.endDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            JsonNode resp = client.getWithBearer(url, accessToken);
            JsonNode timeseries = resp.path("timeseries_stats");
            if (timeseries.isArray()) {
                for (JsonNode ts : timeseries) {
                    JsonNode stats = ts.path("timeseries_stat");
                    String campaignId = stats.path("id").asText("");
                    JsonNode series = stats.path("timeseries");
                    if (series.isArray()) {
                        for (JsonNode point : series) {
                            long impressions = point.path("stats").path("impressions").asLong();
                            long clicks = point.path("stats").path("swipes").asLong();
                            long spendMicro = point.path("stats").path("spend").asLong();
                            BigDecimal spend = BigDecimal.valueOf(spendMicro)
                                    .divide(BigDecimal.valueOf(1_000_000), 2, RoundingMode.HALF_UP);
                            BigDecimal cpc = clicks > 0
                                    ? spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO;
                            BigDecimal cpm = impressions > 0
                                    ? spend.multiply(BigDecimal.valueOf(1000))
                                            .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO;
                            BigDecimal ctr = impressions > 0
                                    ? BigDecimal.valueOf(clicks * 100)
                                            .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO;
                            rows.add(new CampaignReportRow(
                                    campaignId,
                                    "Snapchat Campaign",
                                    "ACTIVE",
                                    spend,
                                    impressions,
                                    clicks,
                                    cpc,
                                    cpm,
                                    ctr,
                                    0,
                                    request.startDate()));
                        }
                    }
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Snapchat campaign report fetch failed: {}", e.getMessage());
        }
        return rows;
    }
}
