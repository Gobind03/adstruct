package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Size;

public record DisclaimerPatchRequest(@Size(max = 160) String title, String defaultText, String status) {}
