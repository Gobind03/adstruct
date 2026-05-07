package com.avyukt.marketsuite.integration.api.dto;

public record IntegrationAccountUpdateRequest(String displayName, String scopesJson, String externalAccountId) {}
