package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.UserStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(UUID id, String email, String fullName, UserStatus status, OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
