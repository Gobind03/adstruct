package com.avyukt.marketsuite.research.api.dto;

import java.util.List;

public record PersonaPatchRequest(
        String name,
        List<String> pains,
        List<String> objections,
        List<String> motivations,
        List<String> channels,
        String language,
        String sentiment) {}
