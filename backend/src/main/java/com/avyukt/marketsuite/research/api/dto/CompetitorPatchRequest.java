package com.avyukt.marketsuite.research.api.dto;

import java.util.List;

public record CompetitorPatchRequest(
        String name,
        String websiteUrl,
        String description,
        List<String> categoryTags,
        String status) {}
