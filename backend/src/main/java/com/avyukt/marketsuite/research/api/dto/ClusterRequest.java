package com.avyukt.marketsuite.research.api.dto;

import java.util.List;
import java.util.UUID;

public record ClusterRequest(
        UUID snapshotId,
        List<String> keywords,
        String language) {}
