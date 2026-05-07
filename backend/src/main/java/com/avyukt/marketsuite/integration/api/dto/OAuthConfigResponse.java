package com.avyukt.marketsuite.integration.api.dto;

import java.util.UUID;

public record OAuthConfigResponse(
        UUID id,
        String platformType,
        String clientId,
        String authUrl,
        String tokenUrl,
        String scopes,
        String redirectUri,
        String extraParamsJson,
        boolean enabled) {}
