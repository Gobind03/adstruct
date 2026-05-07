package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InviteAcceptRequest(
        @NotBlank(message = "Token is required") String token,
        @NotBlank(message = "Full name is required") @Size(max = 160) String fullName,
        @NotBlank(message = "Password is required") @Size(min = 8, max = 128) String password) {}
