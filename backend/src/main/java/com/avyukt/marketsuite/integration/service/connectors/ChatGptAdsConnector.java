package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ChatGptAdsConnector implements IntegrationConnector {

    @Override
    public PlatformType platformType() {
        return PlatformType.CHATGPT_ADS;
    }

    @Override
    public IntegrationCategory category() {
        return IntegrationCategory.ADS;
    }

    @Override
    public ValidationResult validate(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return ValidationResult.failure("API key is required");
        }
        return ValidationResult.success();
    }

    @Override
    public List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId) {
        return List.of();
    }

    @Override
    public List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request) {
        return List.of();
    }
}
