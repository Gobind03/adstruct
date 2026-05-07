package com.avyukt.marketsuite.creative.api.dto;

import java.util.List;
import java.util.UUID;

public record GenerateHooksResponse(
    List<UUID> artifactIds,
    UUID runId
) {}
