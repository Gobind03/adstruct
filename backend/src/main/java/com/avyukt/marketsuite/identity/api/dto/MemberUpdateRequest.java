package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import jakarta.validation.constraints.NotNull;

public record MemberUpdateRequest(@NotNull(message = "Role is required") MemberRole role) {}
