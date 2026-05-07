package com.avyukt.marketsuite.research.service.connectors;

import java.util.UUID;

public record IngestResult(UUID sourceId, UUID snapshotId, UUID jobId) {}
