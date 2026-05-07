package com.avyukt.marketsuite.creative.api.dto;

import java.util.List;
import java.util.UUID;

public record GenerateCopyResponse(
    List<UUID> copyArtifactIds,
    UUID variantSetId,
    UUID runId,
    List<UUID> aiLinkIds,
    List<String> governanceStatuses
) {}
