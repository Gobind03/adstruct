package com.avyukt.marketsuite.ai.service.gateway;

import com.avyukt.marketsuite.ai.domain.LlmProviderType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class LlmGatewayRouter {

    private final OpenAiGateway openAiGateway;
    private final PerplexityGateway perplexityGateway;
    private final CustomHttpGateway customHttpGateway;
    private final MockGateway mockGateway;

    public LlmGatewayRouter(
            OpenAiGateway openAiGateway,
            PerplexityGateway perplexityGateway,
            CustomHttpGateway customHttpGateway,
            MockGateway mockGateway) {
        this.openAiGateway = openAiGateway;
        this.perplexityGateway = perplexityGateway;
        this.customHttpGateway = customHttpGateway;
        this.mockGateway = mockGateway;
    }

    public LlmResponse route(LlmRequest request) {
        LlmProviderType type = request.providerType();
        if (type == null) {
            log.warn("LlmRequest providerType is null; routing to mock gateway");
            return mockGateway.chat(request);
        }
        return switch (type) {
            case OPENAI -> openAiGateway.chat(request);
            case PERPLEXITY -> perplexityGateway.chat(request);
            case CUSTOM_HTTP -> customHttpGateway.chat(request);
            case MOCK -> mockGateway.chat(request);
            default -> {
                log.warn("Unsupported LlmProviderType {}; routing to mock gateway", type);
                yield mockGateway.chat(request);
            }
        };
    }
}
