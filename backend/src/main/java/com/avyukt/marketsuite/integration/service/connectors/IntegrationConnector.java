package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;

public interface IntegrationConnector {

    PlatformType platformType();

    IntegrationCategory category();

    ValidationResult validate(String accessToken);

    List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId);

    List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request);

    default List<CampaignReportRow> parseWebhookPayload(String body) {
        return List.of();
    }

    default boolean verifyWebhookSignature(String body, String secret, String signatureHeader) {
        return false;
    }
}
