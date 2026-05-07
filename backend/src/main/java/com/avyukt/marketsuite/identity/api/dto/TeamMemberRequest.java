package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TeamMemberRequest(@NotNull(message = "User ID is required") UUID userId) {}
