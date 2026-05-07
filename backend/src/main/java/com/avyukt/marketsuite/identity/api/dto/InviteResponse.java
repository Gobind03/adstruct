package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.InviteStatus;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InviteResponse(
        UUID id,
        UUID orgId,
        UUID workspaceId,
        String email,
        MemberRole role,
        InviteStatus status,
        String inviteLink,
        UUID invitedByUserId,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {}
