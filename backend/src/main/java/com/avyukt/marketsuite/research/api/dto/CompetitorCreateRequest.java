package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CompetitorCreateRequest(
        @NotBlank String name,
        String websiteUrl,
        String description,
        List<String> categoryTags) {}
