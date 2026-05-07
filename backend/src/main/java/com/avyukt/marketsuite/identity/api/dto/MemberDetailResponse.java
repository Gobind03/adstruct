package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.UserStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record MemberDetailResponse(
        UUID membershipId,
        UUID userId,
        String email,
        String fullName,
        UserStatus userStatus,
        MemberRole role,
        UUID orgId,
        UUID workspaceId,
        String workspaceName,
        OffsetDateTime createdAt) {}
