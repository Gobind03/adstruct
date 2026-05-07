package com.avyukt.marketsuite.research.api.dto;

import java.util.UUID;

public record IngestResponse(
        UUID sourceId,
        UUID snapshotId,
        UUID jobId) {}
