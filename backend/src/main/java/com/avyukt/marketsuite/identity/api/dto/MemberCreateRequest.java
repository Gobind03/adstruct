package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record MemberCreateRequest(
        @NotBlank(message = "Email is required") @Email String email,
        String fullName,
        @NotNull(message = "Role is required") MemberRole role,
        UUID workspaceId) {}
