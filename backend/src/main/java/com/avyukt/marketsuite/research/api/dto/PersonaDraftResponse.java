package com.avyukt.marketsuite.research.api.dto;

import java.util.UUID;

public record PersonaDraftResponse(
        UUID personaId,
        UUID runId) {}
