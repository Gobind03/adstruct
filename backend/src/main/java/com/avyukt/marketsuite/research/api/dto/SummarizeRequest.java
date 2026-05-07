package com.avyukt.marketsuite.research.api.dto;

import java.util.UUID;

public record SummarizeRequest(
        String language,
        UUID providerOverride,
        String modelOverride) {}
