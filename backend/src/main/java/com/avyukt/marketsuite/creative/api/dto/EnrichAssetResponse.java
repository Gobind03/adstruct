package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record EnrichAssetResponse(
    UUID proposalId,
    UUID runId
) {}
