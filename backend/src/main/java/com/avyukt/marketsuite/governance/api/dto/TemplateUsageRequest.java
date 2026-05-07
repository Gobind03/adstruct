package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TemplateUsageRequest(
        @NotNull UUID workspaceId, @NotBlank String usedInEntityType, @NotNull UUID usedInEntityId) {}
