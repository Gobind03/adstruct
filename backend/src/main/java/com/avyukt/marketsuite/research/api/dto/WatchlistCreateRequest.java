package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.Map;
import java.util.UUID;

public record WatchlistCreateRequest(
        @NotBlank String watchlistType,
        @NotBlank String name,
        UUID competitorId,
        Map<String, Object> queryJson,
        String frequency) {}
