package com.avyukt.marketsuite.identity.api.dto;

import com.avyukt.marketsuite.identity.domain.OrgStatus;
import jakarta.validation.constraints.Size;

public record OrganizationUpdateRequest(
        @Size(min = 1, max = 140, message = "Name must be between 1 and 140 characters") String name,
        @Size(max = 60) String timezone,
        @Size(max = 3) String currency,
        OrgStatus status) {}
