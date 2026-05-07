package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ResearchLinkCreateRequest(
        @NotBlank String researchEntityType,
        @NotNull UUID researchEntityId,
        @NotBlank String linkedEntityType,
        @NotNull UUID linkedEntityId,
        @NotBlank String relationType,
        String note) {}
