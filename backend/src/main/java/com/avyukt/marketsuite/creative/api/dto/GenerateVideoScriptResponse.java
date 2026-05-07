package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record GenerateVideoScriptResponse(
    UUID copyArtifactId,
    UUID runId
) {}
