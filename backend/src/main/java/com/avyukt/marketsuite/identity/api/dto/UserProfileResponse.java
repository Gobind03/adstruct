package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.UserStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String fullName,
        UserStatus status,
        List<MembershipResponse> memberships,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
