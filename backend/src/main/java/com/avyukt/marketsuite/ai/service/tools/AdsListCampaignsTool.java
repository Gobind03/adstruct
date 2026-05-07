package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdsListCampaignsTool implements AiTool {

    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "ads.listConversationCampaigns";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            ArrayNode campaigns = objectMapper.createArrayNode();
            campaigns.add(campaign(UUID.randomUUID(), "Prospecting — Core SKU", "ACTIVE", 120.0));
            campaigns.add(campaign(UUID.randomUUID(), "Remarketing — Cart abandoners", "PAUSED", 75.5));
            campaigns.add(campaign(UUID.randomUUID(), "Brand — Always on", "ACTIVE", 200.0));
            return campaigns;
        } catch (Exception e) {
            log.warn("ads.listConversationCampaigns failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }

    private ObjectNode campaign(UUID id, String name, String status, double dailyBudget) {
        ObjectNode n = objectMapper.createObjectNode();
        n.put("id", id.toString());
        n.put("name", name);
        n.put("status", status);
        n.put("dailyBudget", dailyBudget);
        return n;
    }
}
