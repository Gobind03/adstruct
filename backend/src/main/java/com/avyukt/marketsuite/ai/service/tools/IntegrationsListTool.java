package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationsListTool implements AiTool {

    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "integrations.listWorkspaceIntegrations";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            ArrayNode integrations = objectMapper.createArrayNode();
            integrations.add(row(PlatformType.META.name(), "act_mock_1001", true));
            integrations.add(row(PlatformType.GOOGLE_ADS.name(), "cust_mock_2002", true));
            integrations.add(row(PlatformType.TIKTOK.name(), "adv_mock_3003", false));
            return integrations;
        } catch (Exception e) {
            log.warn("integrations.listWorkspaceIntegrations failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }

    private ObjectNode row(String platformType, String accountId, boolean enabled) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("platformType", platformType);
        n.put("accountId", accountId);
        n.put("enabled", enabled);
        return n;
    }
}
