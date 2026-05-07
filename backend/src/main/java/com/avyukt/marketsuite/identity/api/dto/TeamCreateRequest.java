package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record TeamCreateRequest(
        @NotBlank(message = "Name is required") @Size(max = 255) String name, UUID workspaceId) {}
