package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

public record PersonaCreateRequest(
        @NotBlank String name,
        List<String> pains,
        List<String> objections,
        List<String> motivations,
        List<String> channels,
        String language,
        String sentiment,
        UUID sourceSnapshotId) {}
