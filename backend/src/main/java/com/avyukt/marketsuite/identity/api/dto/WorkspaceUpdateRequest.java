package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.Size;

public record WorkspaceUpdateRequest(
        @Size(min = 1, max = 140, message = "Name must be between 1 and 140 characters") String name,
        @Size(max = 40) String market) {}
