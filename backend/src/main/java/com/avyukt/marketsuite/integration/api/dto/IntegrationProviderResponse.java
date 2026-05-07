package com.avyukt.marketsuite.integration.api.dto;

import java.util.UUID;

public record IntegrationProviderResponse(
        UUID id,
        String platformType,
        String category,
        String displayName,
        String authType,
        String capabilitiesJson,
        String docsUrl) {}
