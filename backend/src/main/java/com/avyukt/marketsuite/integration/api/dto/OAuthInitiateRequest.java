package com.avyukt.marketsuite.integration.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record OAuthInitiateRequest(@NotNull UUID orgId, String displayName) {}
