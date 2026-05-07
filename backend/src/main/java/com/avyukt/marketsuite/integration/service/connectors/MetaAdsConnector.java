package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MetaAdsConnector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(MetaAdsConnector.class);
    private static final String BASE_URL = "https://graph.facebook.com/v21.0";
    private final PlatformRestClient client;
    private final ObjectMapper objectMapper;

    public MetaAdsConnector(PlatformRestClient client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.META;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithQueryToken(BASE_URL + "/me?fields=id,name", accessToken);
            if (resp.has("id")) {
                return ValidationResult.success();
            }
            String error = resp.path("error").path("message").asText("Unknown error");
            return ValidationResult.failure(error);
        } catch (PlatformApiException e) {
            return ValidationResult.failure("Meta API validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode adAccounts =
                    client.getWithQueryToken(BASE_URL + "/me/adaccounts?fields=name,account_id,account_status", accessToken);
            if (adAccounts.has("data")) {
                for (JsonNode acct : adAccounts.get("data")) {
                    resources.add(new DiscoveredResource(
                            ResourceType.AD_ACCOUNT,
                            acct.path("account_id").asText(),
                            acct.path("name").asText("Ad Account"),
                            Map.of("account_status", acct.path("account_status").asInt())));
                }
            }
            JsonNode pages = client.getWithQueryToken(BASE_URL + "/me/accounts?fields=id,name,category", accessToken);
            if (pages.has("data")) {
                for (JsonNode page : pages.get("data")) {
                    resources.add(new DiscoveredResource(
                            ResourceType.PAGE,
                            page.path("id").asText(),
                            page.path("name").asText("Page"),
                            Map.of("category", page.path("category").asText(""))));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Meta resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            String url = String.format(
                    "%s/act_%s/insights?fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,cpm,ctr,actions"
                            + "&time_range={\"since\":\"%s\",\"until\":\"%s\"}&level=campaign&time_increment=1",
                    BASE_URL,
                    request.adAccountId(),
                    request.startDate().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    request.endDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
            JsonNode resp = client.getWithQueryToken(url, accessToken);
            if (resp.has("data")) {
                for (JsonNode row : resp.get("data")) {
                    long conversions = 0;
                    if (row.has("actions")) {
                        for (JsonNode action : row.get("actions")) {
                            if ("offsite_conversion".equals(action.path("action_type").asText())) {
                                conversions += action.path("value").asLong();
                            }
                        }
                    }
                    rows.add(new CampaignReportRow(
                            row.path("campaign_id").asText(),
                            row.path("campaign_name").asText(),
                            "ACTIVE",
                            new BigDecimal(row.path("spend").asText("0")),
                            row.path("impressions").asLong(),
                            row.path("clicks").asLong(),
                            parseBigDecimal(row, "cpc"),
                            parseBigDecimal(row, "cpm"),
                            parseBigDecimal(row, "ctr"),
                            conversions,
                            LocalDate.parse(row.path("date_start").asText(request.startDate().toString()))));
                }
            }
        } catch (PlatformApiException e) {
            log.warn("Meta campaign report fetch failed: {}", e.getMessage());
        }
        return rows;
    }

    /**
     * Verifies Meta's X-Hub-Signature-256 HMAC-SHA256 signature.
     * Meta signs the raw request body with the app secret.
     */
    @Override
    public boolean verifyWebhookSignature(String body, String secret, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String computed = "sha256=" + HexFormat.of().formatHex(hash);
            return computed.equalsIgnoreCase(signatureHeader);
        } catch (Exception e) {
            log.warn("Meta webhook signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Parses Meta's ad_account webhook payload.
     * Format: {"object":"ad_account","entry":[{"id":"act_...","time":...,"changes":[{"field":"campaign","value":{...}}]}]}
     */
    @Override
    public List<CampaignReportRow> parseWebhookPayload(String body) {
        List<CampaignReportRow> rows = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!"ad_account".equals(root.path("object").asText())) {
                log.debug("Ignoring non-ad_account Meta webhook: {}", root.path("object").asText());
                return rows;
            }

            for (JsonNode entry : root.path("entry")) {
                long timestamp = entry.path("time").asLong(System.currentTimeMillis() / 1000);
                LocalDate date = Instant.ofEpochSecond(timestamp).atZone(ZoneOffset.UTC).toLocalDate();

                for (JsonNode change : entry.path("changes")) {
                    String field = change.path("field").asText();
                    if (!"campaign".equals(field) && !"ad_campaign".equals(field)) {
                        continue;
                    }
                    JsonNode value = change.path("value");
                    String campaignId = value.path("campaign_id").asText(
                            value.path("id").asText());
                    if (campaignId.isEmpty()) continue;

                    String status = value.path("effective_status").asText(
                            value.path("status").asText("ACTIVE")).toUpperCase();

                    rows.add(new CampaignReportRow(
                            campaignId,
                            value.path("campaign_name").asText(value.path("name").asText("Unknown")),
                            status,
                            parseBigDecimal(value, "spend"),
                            value.path("impressions").asLong(),
                            value.path("clicks").asLong(),
                            parseBigDecimal(value, "cpc"),
                            parseBigDecimal(value, "cpm"),
                            parseBigDecimal(value, "ctr"),
                            extractConversions(value),
                            date));
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Meta webhook payload: {}", e.getMessage());
        }
        return rows;
    }

    private long extractConversions(JsonNode value) {
        if (value.has("actions")) {
            for (JsonNode action : value.get("actions")) {
                if ("offsite_conversion".equals(action.path("action_type").asText())) {
                    return action.path("value").asLong();
                }
            }
        }
        return value.path("conversions").asLong();
    }

    private BigDecimal parseBigDecimal(JsonNode node, String field) {
        String val = node.path(field).asText("0");
        try {
            return new BigDecimal(val).setScale(4, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
