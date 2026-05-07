package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record GenerateUgcBriefResponse(
    UUID copyArtifactId,
    UUID runId
) {}
