package com.avyukt.marketsuite.integration.api.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record PlatformEntityMappingCreateRequest(
        @NotNull @JsonAlias("integrationAccountId") UUID accountId,
        UUID resourceId,
        @NotBlank String internalEntityType,
        @NotNull UUID internalEntityId,
        @NotBlank String externalEntityType,
        @NotBlank String externalEntityId,
        String externalParentId,
        String metaJson) {}
