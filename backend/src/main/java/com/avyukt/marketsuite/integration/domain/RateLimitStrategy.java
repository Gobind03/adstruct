package com.avyukt.marketsuite.integration.domain;

public enum RateLimitStrategy {
    NONE,
    TOKEN_BUCKET,
    FIXED_WINDOW,
    PLATFORM_MANAGED
}
