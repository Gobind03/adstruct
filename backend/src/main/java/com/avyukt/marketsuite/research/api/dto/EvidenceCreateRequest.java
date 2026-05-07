package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

public record EvidenceCreateRequest(
        @NotNull UUID snapshotId,
        String citationText,
        String citationUrl,
        Map<String, Object> evidenceJson) {}
