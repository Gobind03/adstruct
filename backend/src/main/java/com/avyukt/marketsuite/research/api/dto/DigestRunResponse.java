package com.avyukt.marketsuite.research.api.dto;

import java.util.UUID;

public record DigestRunResponse(
        UUID digestReportId,
        UUID workflowRunId,
        UUID aiLinkId) {}
