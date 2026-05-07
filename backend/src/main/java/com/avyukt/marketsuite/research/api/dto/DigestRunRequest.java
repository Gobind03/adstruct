package com.avyukt.marketsuite.research.api.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record DigestRunRequest(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd) {}
