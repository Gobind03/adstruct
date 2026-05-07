package com.avyukt.marketsuite.ai.api.dto;

import jakarta.validation.constraints.NotNull;

public record AiSafetyPolicyPatchRequest(@NotNull String policyJson) {}
