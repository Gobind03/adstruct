package com.avyukt.marketsuite.ai.service.tools;

import java.util.List;
import java.util.UUID;

public record AiToolContext(
        UUID workspaceId, UUID orgId, UUID userId, List<String> roles, String correlationId) {}
