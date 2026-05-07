package com.avyukt.marketsuite.ai.service.gateway;

public interface LlmGateway {

    LlmResponse chat(LlmRequest request);

    LlmResponse generate(LlmRequest request);
}
