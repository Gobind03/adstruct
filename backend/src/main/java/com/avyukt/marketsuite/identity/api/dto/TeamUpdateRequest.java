package com.avyukt.marketsuite.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamUpdateRequest(@NotBlank(message = "Name is required") @Size(max = 255) String name) {}
