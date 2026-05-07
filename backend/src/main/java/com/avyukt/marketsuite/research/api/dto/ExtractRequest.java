package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record ExtractRequest(
        @NotEmpty List<UUID> snapshotIds,
        List<String> insightTypes,
        String language) {}
