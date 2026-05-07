package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Size;

public record BrandRuleSetPatchRequest(@Size(max = 160) String name, String domain, String description) {}
