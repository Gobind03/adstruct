package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.repo.AiActionProposalRepository;
import com.avyukt.marketsuite.ai.repo.AiConversationRepository;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActionsProposeTool implements AiTool {

    private final AiActionProposalRepository aiActionProposalRepository;
    private final AiConversationRepository aiConversationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "actions.propose";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.SAFE_WRITE;
    }

    @Override
    @Transactional
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || input.isNull()) {
                return errorJson("input is required");
            }

            if (!input.hasNonNull("conversationId")) {
                return errorJson("conversationId is required");
            }
            UUID conversationId;
            try {
                conversationId = UUID.fromString(input.get("conversationId").asText().trim());
            } catch (Exception ex) {
                return errorJson("conversationId must be a valid UUID");
            }

            AiConversation conversation = aiConversationRepository.findById(conversationId).orElse(null);
            if (conversation == null) {
                return errorJson("conversation not found: " + conversationId);
            }

            Workspace convWorkspace = conversation.getWorkspace();
            if (convWorkspace == null || !ctx.workspaceId().equals(convWorkspace.getId())) {
                return errorJson("conversation does not belong to the current workspace");
            }

            String title = textOrNull(input, "title");
            if (title == null || title.isBlank()) {
                return errorJson("title is required");
            }

            String actionType = textOrNull(input, "actionType");
            if (actionType == null || actionType.isBlank()) {
                return errorJson("actionType is required");
            }

            String targetEntityType = textOrNull(input, "targetEntityType");
            if (targetEntityType == null || targetEntityType.isBlank()) {
                return errorJson("targetEntityType is required");
            }

            UUID targetEntityId = readUuid(input, "targetEntityId");

            String payloadJson = resolvePayloadJson(input);
            if (payloadJson == null || payloadJson.isBlank()) {
                return errorJson("payloadJson is required");
            }

            String description = textOrNull(input, "description");

            Workspace workspaceRef = workspaceRepository.getReferenceById(ctx.workspaceId());
            AiConversation conversationRef = aiConversationRepository.getReferenceById(conversationId);
            AppUser requesterRef = userRepository.getReferenceById(ctx.userId());

            AiActionProposal proposal = AiActionProposal.builder()
                    .workspace(workspaceRef)
                    .conversation(conversationRef)
                    .title(title.trim())
                    .description(description != null ? description.trim() : null)
                    .actionType(actionType.trim())
                    .targetEntityType(targetEntityType.trim())
                    .targetEntityId(targetEntityId)
                    .payloadJson(payloadJson)
                    .status(AgentActionStatus.PROPOSED)
                    .requestedByUser(requesterRef)
                    .build();

            AiActionProposal saved = aiActionProposalRepository.save(proposal);

            ObjectNode out = objectMapper.createObjectNode();
            out.put("proposalId", saved.getId().toString());
            return out;
        } catch (Exception e) {
            log.warn("actions.propose failed: {}", e.getMessage(), e);
            return errorJson(e.getMessage() != null ? e.getMessage() : "unknown error");
        }
    }

    private String resolvePayloadJson(JsonNode input) throws com.fasterxml.jackson.core.JsonProcessingException {
        if (!input.has("payloadJson") || input.get("payloadJson").isNull()) {
            return null;
        }
        JsonNode n = input.get("payloadJson");
        if (n.isTextual()) {
            return n.asText();
        }
        return objectMapper.writeValueAsString(n);
    }

    private static String textOrNull(JsonNode input, String field) {
        if (!input.hasNonNull(field)) {
            return null;
        }
        return input.get(field).asText();
    }

    private static UUID readUuid(JsonNode input, String field) {
        if (!input.hasNonNull(field)) {
            return null;
        }
        try {
            return UUID.fromString(input.get(field).asText().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private ObjectNode errorJson(String message) {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", message);
        return err;
    }
}
