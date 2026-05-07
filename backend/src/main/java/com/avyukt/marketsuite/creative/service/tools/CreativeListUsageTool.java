package com.avyukt.marketsuite.creative.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.creative.domain.CreativeUsage;
import com.avyukt.marketsuite.creative.repo.CreativeUsageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CreativeListUsageTool implements AiTool {

    private final CreativeUsageRepository creativeUsageRepository;
    private final ObjectMapper objectMapper;

    public CreativeListUsageTool(CreativeUsageRepository creativeUsageRepository, ObjectMapper objectMapper) {
        this.creativeUsageRepository = creativeUsageRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "creative.listUsageForCreative";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.isObject()) {
                return invalidInput();
            }
            if (!input.hasNonNull("creativeEntityType") || !input.hasNonNull("creativeEntityId")) {
                return invalidInput();
            }

            String creativeEntityType = input.get("creativeEntityType").asText().trim();
            UUID creativeEntityId;
            try {
                creativeEntityId = UUID.fromString(input.get("creativeEntityId").asText().trim());
            } catch (IllegalArgumentException ex) {
                return invalidInput();
            }

            List<CreativeUsage> usages =
                    creativeUsageRepository.findByWorkspaceIdAndCreativeEntityTypeAndCreativeEntityId(
                            ctx.workspaceId(), creativeEntityType, creativeEntityId);

            ArrayNode items = objectMapper.createArrayNode();
            for (CreativeUsage u : usages) {
                ObjectNode row = objectMapper.createObjectNode();
                row.put("usedEntityType", u.getUsedEntityType() != null ? u.getUsedEntityType() : "");
                row.put("usedEntityId", u.getUsedEntityId() != null ? u.getUsedEntityId().toString() : "");
                row.put("relationType", u.getRelationType() != null ? u.getRelationType() : "");
                row.set("contextJson", parseContextJson(u.getContextJson()));
                items.add(row);
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.set("items", items);
            return result;
        } catch (Exception e) {
            return invalidInput();
        }
    }

    private JsonNode parseContextJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("raw", raw);
            return n;
        }
    }

    private ObjectNode invalidInput() {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", "Invalid input");
        return err;
    }
}
