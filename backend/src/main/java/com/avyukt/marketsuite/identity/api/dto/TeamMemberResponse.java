package com.avyukt.marketsuite.identity.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TeamMemberResponse(UUID userId, String email, String fullName, OffsetDateTime addedAt) {}
