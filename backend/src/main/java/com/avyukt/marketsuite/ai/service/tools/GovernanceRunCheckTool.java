package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRunResponse;
import com.avyukt.marketsuite.governance.service.GovernanceCheckService;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class GovernanceRunCheckTool implements AiTool {

    private final GovernanceCheckService governanceCheckService;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "governance.runCheck";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || input.isNull()) {
                return errorJson("input is required");
            }

            String entityType =
                    input.hasNonNull("entityType") ? input.get("entityType").asText().trim() : "";
            if (entityType.isEmpty()) {
                return errorJson("entityType is required");
            }

            UUID entityId = null;
            if (input.hasNonNull("entityId")) {
                try {
                    entityId = UUID.fromString(input.get("entityId").asText().trim());
                } catch (Exception ex) {
                    return errorJson("entityId must be a valid UUID when provided");
                }
            } else {
                return errorJson("entityId is required");
            }

            String contentPayloadJson = "{}";
            if (input.has("contentPayloadJson") && !input.get("contentPayloadJson").isNull()) {
                JsonNode payloadNode = input.get("contentPayloadJson");
                if (payloadNode.isTextual()) {
                    contentPayloadJson = payloadNode.asText();
                } else {
                    contentPayloadJson = objectMapper.writeValueAsString(payloadNode);
                }
            }

            UUID ruleSetId = null;
            if (input.hasNonNull("ruleSetId")) {
                try {
                    ruleSetId = UUID.fromString(input.get("ruleSetId").asText().trim());
                } catch (Exception ex) {
                    return errorJson("ruleSetId must be a valid UUID when provided");
                }
            }

            PlatformType platformType = null;
            if (input.hasNonNull("platformType")) {
                String raw = input.get("platformType").asText().trim();
                if (!raw.isEmpty()) {
                    try {
                        platformType = PlatformType.valueOf(raw);
                    } catch (IllegalArgumentException ex) {
                        return errorJson("Unknown platformType: " + raw);
                    }
                }
            }

            String language = null;
            if (input.hasNonNull("language")) {
                language = input.get("language").asText().trim();
                if (language.isEmpty()) {
                    language = null;
                }
            }

            GovernanceCheckRunResponse response = governanceCheckService.runChecks(
                    ctx.workspaceId(), entityType, entityId, contentPayloadJson, ruleSetId, platformType, language);

            return objectMapper.valueToTree(response);
        } catch (Exception e) {
            log.warn("governance.runCheck failed: {}", e.getMessage(), e);
            return errorJson(e.getMessage() != null ? e.getMessage() : "unknown error");
        }
    }

    private ObjectNode errorJson(String message) {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", message);
        return err;
    }
}
