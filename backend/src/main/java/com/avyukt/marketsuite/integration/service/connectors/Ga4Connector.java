package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.domain.ResourceType;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class Ga4Connector implements IntegrationConnector {

    private static final Logger log = LoggerFactory.getLogger(Ga4Connector.class);
    private static final String BASE_URL = "https://analyticsadmin.googleapis.com/v1beta";
    private final PlatformRestClient client;

    public Ga4Connector(PlatformRestClient client) {
        this.client = client;
    }

    @Override
    public PlatformType platformType() {
        return PlatformType.GA4;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ANALYTICS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/accountSummaries", accessToken);
            if (resp.has("accountSummaries")) {
                return ValidationResult.success();
            }
            return ValidationResult.failure("No GA4 accounts found");
        } catch (PlatformApiException e) {
            return ValidationResult.failure("GA4 validation failed: " + e.getMessage());
        }
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        List<DiscoveredResource> resources = new ArrayList<>();
        try {
            JsonNode resp = client.getWithBearer(BASE_URL + "/accountSummaries", accessToken);
            JsonNode summaries = resp.path("accountSummaries");
            if (summaries.isArray()) {
                for (JsonNode acct : summaries) {
                    JsonNode propertySummaries = acct.path("propertySummaries");
                    if (propertySummaries.isArray()) {
                        for (JsonNode prop : propertySummaries) {
                            String propId = prop.path("property").asText("").replace("properties/", "");
                            resources.add(new DiscoveredResource(
                                    ResourceType.PROPERTY,
                                    propId,
                                    prop.path("displayName").asText("GA4 Property"),
                                    Map.of("parent", acct.path("displayName").asText(""))));
                        }
                    }
                }
            }
        } catch (PlatformApiException e) {
            log.warn("GA4 resource discovery failed: {}", e.getMessage());
        }
        return resources;
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        return List.of();
    }
}
