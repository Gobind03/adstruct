package com.avyukt.marketsuite.integration.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SyncJobCreateRequest(
        @NotNull UUID accountId,
        UUID workspaceId,
        UUID resourceId,
        @NotBlank String mode) {}
