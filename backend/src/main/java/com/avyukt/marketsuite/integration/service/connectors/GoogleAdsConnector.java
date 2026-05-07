package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class GoogleAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(GoogleAdsConnector.class);
    private static final String BASE_URL = "https://googleads.googleapis.com/v17";
    private final PlatformRestClient client;
    private final ObjectMapper objectMapper;

    public GoogleAdsConnector(PlatformRestClient client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.GOOGLE_ADS;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/customers:listAccessibleCustomers", accessToken);
            if (resp.has("resourceNames")) {
                return ValidationResult.success();
            }
            return ValidationResult.failure("No accessible Google Ads customers found");
        } catch (PlatformApiException e) {
            return ValidationResult.failure("Google Ads validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/customers:listAccessibleCustomers", accessToken);
            if (resp.has("resourceNames")) {
                for (JsonNode rn : resp.get("resourceNames")) {
                    String customerId = rn.asText().replace("customers/", "");
                    resources.add(new DiscoveredResource(
                            ResourceType.AD_ACCOUNT, customerId, "Google Ads Customer " + customerId, Map.of()));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Google Ads resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String gaql = String.format(
                    "SELECT campaign.id, campaign.name, campaign.status, "
                            + "metrics.cost_micros, metrics.impressions, metrics.clicks, "
                            + "metrics.conversions, segments.date "
                            + "FROM campaign WHERE segments.date BETWEEN '%s' AND '%s'",
                    request.startDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    request.endDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            Map<String, String> body = Map.of("query", gaql);
            String url = BASE_URL + "/customers/" + request.adAccountId() + "/googleAds:searchStream";
            JsonNode resp = client.postJsonWithBearer(url, accessToken, body);
            if (resp.isArray()) {
                for (JsonNode batch : resp) {
                    if (batch.has("results")) {
                        for (JsonNode result : batch.get("results")) {
                            JsonNode campaign = result.path("campaign");
                            JsonNode metrics = result.path("metrics");
                            JsonNode segments = result.path("segments");
                            long costMicros = metrics.path("costMicros").asLong();
                            BigDecimal spend =
                                    BigDecimal.valueOf(costMicros).divide(BigDecimal.valueOf(1_000_000), 2, RoundingMode.HALF_UP);
                            long impressions = metrics.path("impressions").asLong();
                            long clicks = metrics.path("clicks").asLong();
                            BigDecimal cpc =
                                    clicks > 0 ? spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                            BigDecimal cpm = impressions > 0
                                    ? spend.multiply(BigDecimal.valueOf(1000))
                                            .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO;
                            BigDecimal ctr = impressions > 0
                                    ? BigDecimal.valueOf(clicks)
                                            .multiply(BigDecimal.valueOf(100))
                                            .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP)
                                    : BigDecimal.ZERO;
                            rows.add(new CampaignReportRow(
                                    campaign.path("id").asText(),
                                    campaign.path("name").asText(),
                                    campaign.path("status").asText(),
                                    spend,
                                    impressions,
                                    clicks,
                                    cpc,
                                    cpm,
                                    ctr,
                                    metrics.path("conversions").asLong(),
                                    java.time.LocalDate.parse(segments.path("date").asText())));
                        }
                    }
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Google Ads campaign report fetch failed: {}", e.getMessage());
        }
        return rows;
    }

    /**
     * Verifies Google Cloud Pub/Sub push subscription bearer token.
     * The signatureHeader is expected to be the Authorization: Bearer token value.
     * In production, validate the JWT against Google's public keys.
     */
    @Override
    public boolean verifyWebhookSignature(String body, String secret, String signatureHeader) {
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        String token = signatureHeader.startsWith("Bearer ")
                ? signatureHeader.substring(7) : signatureHeader;
        return !token.isBlank();
    }

    /**
     * Parses Google Cloud Pub/Sub push message containing campaign change data.
     * Format: {"message":{"data":"base64...","messageId":"...","attributes":{...}},"subscription":"..."}
     * The decoded data contains campaign metrics in the Google Ads API format.
     */
    @Override
    public List<CampaignReportRow> parseWebhookPayload(String body) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode message = root.path("message");
            if (message.isMissingNode()) {
                return parseDirectPayload(root);
            }

            String data64 = message.path("data").asText("");
            if (data64.isEmpty()) return rows;

            String decoded = new String(Base64.getDecoder().decode(data64), StandardCharsets.UTF_8);
            JsonNode payload = objectMapper.readTree(decoded);
            return parseDirectPayload(payload);
        } catch (Exception e) {
            log.warn("Failed to parse Google Ads webhook payload: {}", e.getMessage());
        }
        return rows;
    }

    private List<CampaignReportRow> parseDirectPayload(JsonNode payload) {
        List<CampaignReportRow> rows = new ArrayList<>();
        JsonNode results = payload.has("results") ? payload.get("results") : payload.path("campaigns");
        if (results == null || !results.isArray()) return rows;

        for (JsonNode result : results) {
            JsonNode campaign = result.has("campaign") ? result.get("campaign") : result;
            JsonNode metrics = result.path("metrics");
            String campaignId = campaign.path("id").asText(campaign.path("campaignId").asText(""));
            if (campaignId.isEmpty()) continue;

            long costMicros = metrics.path("costMicros").asLong(metrics.path("cost_micros").asLong());
            BigDecimal spend = BigDecimal.valueOf(costMicros)
                    .divide(BigDecimal.valueOf(1_000_000), 2, RoundingMode.HALF_UP);
            long impressions = metrics.path("impressions").asLong();
            long clicks = metrics.path("clicks").asLong();

            BigDecimal cpc = clicks > 0
                    ? spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal cpm = impressions > 0
                    ? spend.multiply(BigDecimal.valueOf(1000))
                    .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;
            BigDecimal ctr = impressions > 0
                    ? BigDecimal.valueOf(clicks).multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(impressions), 4, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            String dateStr = result.path("segments").path("date").asText(
                    campaign.path("date").asText(""));
            LocalDate date = dateStr.isEmpty() ? LocalDate.now() : LocalDate.parse(dateStr);

            rows.add(new CampaignReportRow(
                    campaignId,
                    campaign.path("name").asText("Unknown"),
                    campaign.path("status").asText("ACTIVE"),
                    spend, impressions, clicks, cpc, cpm, ctr,
                    metrics.path("conversions").asLong(),
                    date));
        }
        return rows;
    }
}
