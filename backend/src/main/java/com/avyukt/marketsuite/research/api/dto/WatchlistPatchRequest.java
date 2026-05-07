package com.avyukt.marketsuite.research.api.dto;

import java.util.Map;

public record WatchlistPatchRequest(
        String name,
        Map<String, Object> queryJson,
        String frequency,
        Boolean enabled) {}
