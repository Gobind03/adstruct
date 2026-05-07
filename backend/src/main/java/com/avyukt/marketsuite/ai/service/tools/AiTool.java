package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.fasterxml.jackson.databind.JsonNode;

public interface AiTool {

    String name();

    ToolRiskLevel riskLevel();

    JsonNode execute(AiToolContext ctx, JsonNode input);
}
