package com.avyukt.marketsuite.integration.api.dto;

public record OAuthConfigUpdateRequest(
        String clientId,
        String clientSecret,
        String scopes,
        String redirectUri,
        String extraParamsJson,
        Boolean enabled) {}
