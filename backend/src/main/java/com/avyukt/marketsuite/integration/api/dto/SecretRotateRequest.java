package com.avyukt.marketsuite.integration.api.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.Map;

public record SecretRotateRequest(@NotEmpty(message = "Secret payload is required") Map<String, String> secretPayload) {}
