package com.avyukt.marketsuite.research.api.dto;

import java.util.List;
import java.util.UUID;

public record ExtractResponse(
        List<UUID> createdInsightIds,
        UUID runId,
        List<UUID> aiLinkIds) {}
