package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
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
public class GovernanceGetBrandProfileTool implements AiTool {

    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "governance.getEffectiveBrandProfile";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            ArrayNode languages = objectMapper.createArrayNode();
            languages.add("en-US");
            languages.add("es-MX");

            ObjectNode root = objectMapper.createObjectNode();
            root.put("displayName", "Acme Brand (effective profile)");
            root.put("voiceTone", "Confident, helpful, concise; avoid hype and unverified claims.");
            root.set("languages", languages);
            return root;
        } catch (Exception e) {
            log.warn("governance.getEffectiveBrandProfile failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }
}
