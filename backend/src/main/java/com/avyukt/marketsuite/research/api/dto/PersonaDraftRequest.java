package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record PersonaDraftRequest(
        @NotBlank String personaName,
        @NotEmpty List<UUID> snapshotIds,
        String language) {}
