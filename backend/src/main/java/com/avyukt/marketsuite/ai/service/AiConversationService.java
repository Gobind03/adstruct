package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AgentMode;
import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AiMessage;
import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import com.avyukt.marketsuite.ai.domain.AiToolCall;
import com.avyukt.marketsuite.ai.domain.ConversationStatus;
import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.avyukt.marketsuite.ai.domain.MessageRole;
import com.avyukt.marketsuite.ai.domain.SafetyDecision;
import com.avyukt.marketsuite.ai.domain.ToolCallStatus;
import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.repo.AiCitationRepository;
import com.avyukt.marketsuite.ai.repo.AiConversationRepository;
import com.avyukt.marketsuite.ai.repo.AiMessageRepository;
import com.avyukt.marketsuite.ai.repo.AiToolCallRepository;
import com.avyukt.marketsuite.ai.service.gateway.LlmGatewayRouter;
import com.avyukt.marketsuite.ai.service.gateway.LlmMessage;
import com.avyukt.marketsuite.ai.service.gateway.LlmRequest;
import com.avyukt.marketsuite.ai.service.gateway.LlmResponse;
import com.avyukt.marketsuite.ai.service.safety.AiSafetyService;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.ai.service.tools.ToolRegistry;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.avyukt.marketsuite.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AiConversationService {

    private static final String BLOCKED_REPLY =
            "This message cannot be processed due to workspace safety policies. Please revise your request.";

    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    private final AiCitationRepository citationRepository;
    private final AiToolCallRepository toolCallRepository;
    private final AiProviderSelectionService providerSelectionService;
    private final AiSafetyService safetyService;
    private final ToolRegistry toolRegistry;
    private final LlmGatewayRouter llmGatewayRouter;
    private final AuditService auditService;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AiConversationService(
            AiConversationRepository conversationRepository,
            AiMessageRepository messageRepository,
            AiCitationRepository citationRepository,
            AiToolCallRepository toolCallRepository,
            AiProviderSelectionService providerSelectionService,
            AiSafetyService safetyService,
            ToolRegistry toolRegistry,
            LlmGatewayRouter llmGatewayRouter,
            AuditService auditService,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.citationRepository = citationRepository;
        this.toolCallRepository = toolCallRepository;
        this.providerSelectionService = providerSelectionService;
        this.safetyService = safetyService;
        this.toolRegistry = toolRegistry;
        this.llmGatewayRouter = llmGatewayRouter;
        this.auditService = auditService;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public AiConversation create(
            UUID workspaceId, String title, AgentMode agentMode, UUID providerConfigId, String model) {
        UUID userId = SecurityUtils.currentUserId();
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        AppUser user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        AiProviderConfig provider = null;
        if (providerConfigId != null) {
            provider = providerSelectionService.resolveProvider(workspaceId, providerConfigId);
            if (model != null && !model.isBlank()) {
                providerSelectionService.validateModelAllowed(workspaceId, provider.getId(), model);
            }
        }

        AiConversation conv =
                AiConversation.builder()
                        .workspace(workspace)
                        .title(title != null ? title : "Conversation")
                        .status(ConversationStatus.ACTIVE)
                        .agentMode(agentMode != null ? agentMode : AgentMode.TOOL_ASSISTED)
                        .providerConfig(provider)
                        .model(model)
                        .contextJson("{}")
                        .createdByUser(user)
                        .build();

        AiConversation saved = conversationRepository.save(conv);
        auditService.log(
                workspace.getOrg().getId(),
                workspaceId,
                userId,
                "AI_CONVERSATION_CREATE",
                "AiConversation",
                saved.getId(),
                null,
                summarizeConversationJson(saved));
        return saved;
    }

    public AiMessage postMessage(UUID conversationId, String userContent) {
        UUID actorId = SecurityUtils.currentUserId();
        AiConversation conversation =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));

        if (conversation.getStatus() != ConversationStatus.ACTIVE) {
            throw new BusinessException("Conversation is not active");
        }

        UUID workspaceId = conversation.getWorkspace().getId();

        SafetyDecision safety = safetyService.classifySafety(workspaceId, userContent);
        if (safety == SafetyDecision.BLOCK) {
            AiMessage systemMsg =
                    AiMessage.builder()
                            .conversation(conversation)
                            .role(MessageRole.SYSTEM)
                            .content(BLOCKED_REPLY)
                            .contentJson("{}")
                            .createdByUser(null)
                            .build();
            return messageRepository.save(systemMsg);
        }

        String redactedUser = safetyService.redactSecrets(workspaceId, userContent != null ? userContent : "");

        AppUser actor =
                userRepository
                        .findById(actorId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", actorId));

        AiMessage userMessage =
                AiMessage.builder()
                        .conversation(conversation)
                        .role(MessageRole.USER)
                        .content(redactedUser)
                        .contentJson("{}")
                        .createdByUser(actor)
                        .build();
        userMessage = messageRepository.save(userMessage);

        AiProviderConfig provider =
                providerSelectionService.resolveProvider(
                        workspaceId,
                        conversation.getProviderConfig() != null ? conversation.getProviderConfig().getId() : null);

        String model =
                conversation.getModel() != null && !conversation.getModel().isBlank()
                        ? conversation.getModel()
                        : provider.getDefaultModel();
        providerSelectionService.validateModelAllowed(workspaceId, provider.getId(), model);

        List<AiMessage> priorMessages =
                messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<UUID> priorIds = priorMessages.stream().map(AiMessage::getId).toList();
        int citationCount =
                priorIds.isEmpty() ? 0 : citationRepository.findByMessageIdIn(priorIds).size();
        String systemContext = buildWorkspaceContextString(conversation.getWorkspace(), citationCount);

        List<String> toolDigestParts = new ArrayList<>();
        if (conversation.getAgentMode() == AgentMode.TOOL_ASSISTED) {
            toolDigestParts.addAll(
                    runDeterministicTools(workspaceId, conversation, userMessage, redactedUser, actorId));
        }

        List<LlmMessage> llmMessages = buildLlmMessages(systemContext, conversationId, toolDigestParts);

        String secretRef =
                provider.getIntegrationAccount() != null
                        ? provider.getIntegrationAccount().getSecretRef()
                        : null;
        Map<String, String> metadata = new LinkedHashMap<>();
        if (secretRef != null && !secretRef.isBlank()) {
            metadata.put("secretRef", secretRef);
        }

        LlmRequest request =
                new LlmRequest(
                        provider.getProviderType(),
                        model,
                        LlmCallPurpose.CHAT,
                        llmMessages,
                        provider.getTemperature() != null ? provider.getTemperature().doubleValue() : 0.4,
                        provider.getMaxTokens(),
                        metadata);

        LlmResponse response = llmGatewayRouter.route(request);
        String assistantText = response.text() != null ? response.text() : "";
        if (assistantText.isBlank() && response.json() != null) {
            assistantText = response.json();
        }
        String redactedAssistant = safetyService.redactSecrets(workspaceId, assistantText);

        AiMessage assistant =
                AiMessage.builder()
                        .conversation(conversation)
                        .role(MessageRole.ASSISTANT)
                        .content(redactedAssistant)
                        .contentJson("{}")
                        .createdByUser(null)
                        .build();
        return messageRepository.save(assistant);
    }

    @Transactional(readOnly = true)
    public List<AiMessage> getMessages(UUID conversationId) {
        if (!conversationRepository.existsById(conversationId)) {
            throw new ResourceNotFoundException("AiConversation", "id", conversationId);
        }
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public void archive(UUID conversationId) {
        UUID actorId = SecurityUtils.currentUserId();
        AiConversation conv =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
        String before = summarizeConversationJson(conv);
        conv.setStatus(ConversationStatus.ARCHIVED);
        AiConversation saved = conversationRepository.save(conv);
        auditService.log(
                conv.getWorkspace().getOrg().getId(),
                conv.getWorkspace().getId(),
                actorId,
                "AI_CONVERSATION_ARCHIVE",
                "AiConversation",
                saved.getId(),
                before,
                summarizeConversationJson(saved));
    }

    private List<String> runDeterministicTools(
            UUID workspaceId,
            AiConversation conversation,
            AiMessage userMessage,
            String userContent,
            UUID userId) {

        String lower = userContent.toLowerCase(Locale.ROOT);
        List<String> orderedToolNames = new ArrayList<>();
        if (matchesAny(lower, "show", "list", "search", "find")) {
            orderedToolNames.add("research.searchInsights");
        }
        if (matchesAny(lower, "check", "compliance", "govern")) {
            orderedToolNames.add("governance.runCheck");
        }
        if (matchesAny(lower, "brand", "profile", "voice")) {
            orderedToolNames.add("governance.getEffectiveBrandProfile");
        }
        if (matchesAny(lower, "integration", "connected", "account")) {
            orderedToolNames.add("integrations.listWorkspaceIntegrations");
        }
        if (matchesAny(lower, "campaign", "ad")) {
            orderedToolNames.add("ads.listConversationCampaigns");
        }
        if (matchesAny(lower, "create", "update", "propose", "change")) {
            orderedToolNames.add("actions.propose");
        }

        Set<String> deduped = new LinkedHashSet<>(orderedToolNames);
        List<String> outputs = new ArrayList<>();
        int executed = 0;
        UserPrincipal principal = SecurityUtils.currentUser();
        List<String> roles =
                principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList());
        AiToolContext ctx =
                new AiToolContext(
                        workspaceId,
                        conversation.getWorkspace().getOrg().getId(),
                        userId,
                        roles,
                        UUID.randomUUID().toString());

        for (String toolName : deduped) {
            if (!safetyService.canMakeMoreToolCalls(workspaceId, conversation.getId(), executed)) {
                break;
            }
            Optional<AiTool> toolOpt = toolRegistry.getTool(toolName);
            if (toolOpt.isEmpty()) {
                log.warn("Tool not registered: {}", toolName);
                continue;
            }
            AiTool tool = toolOpt.get();
            if (safetyService.checkToolPermission(workspaceId, toolName, tool.riskLevel(), primaryRole(roles))
                    == SafetyDecision.BLOCK) {
                log.info("Tool {} blocked by safety policy", toolName);
                continue;
            }

            JsonNode input = buildToolInput(toolName, conversation.getId(), userContent);
            AiToolCall call =
                    AiToolCall.builder()
                            .conversation(conversation)
                            .message(userMessage)
                            .toolName(toolName)
                            .status(ToolCallStatus.RUNNING)
                            .inputJson(writeJsonSafe(input))
                            .startedAt(OffsetDateTime.now())
                            .build();
            call = toolCallRepository.save(call);

            try {
                JsonNode out = tool.execute(ctx, input);
                call.setStatus(ToolCallStatus.SUCCEEDED);
                call.setOutputJson(writeJsonSafe(out));
            } catch (Exception e) {
                log.warn("Tool {} failed: {}", toolName, e.getMessage());
                call.setStatus(ToolCallStatus.FAILED);
                call.setErrorMessage(e.getMessage() != null ? e.getMessage() : "error");
            }
            call.setFinishedAt(OffsetDateTime.now());
            toolCallRepository.save(call);
            executed++;

            try {
                JsonNode outNode =
                        call.getOutputJson() != null && !call.getOutputJson().isBlank()
                                ? objectMapper.readTree(call.getOutputJson())
                                : objectMapper.createObjectNode();
                outputs.add(toolName + ": " + objectMapper.writeValueAsString(outNode));
            } catch (Exception e) {
                outputs.add(toolName + ": " + call.getOutputJson());
            }
        }

        return outputs;
    }

    private static String primaryRole(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return null;
        }
        return roles.get(0);
    }

    private static boolean matchesAny(String lowerContent, String... words) {
        for (String w : words) {
            if (lowerContent.contains(w.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private JsonNode buildToolInput(String toolName, UUID conversationId, String userContent) {
        ObjectNode n = objectMapper.createObjectNode();
        switch (toolName) {
            case "research.searchInsights" -> {
                String q = userContent != null && userContent.length() > 200 ? userContent.substring(0, 200) : userContent;
                n.put("q", q != null ? q : "");
            }
            case "actions.propose" -> {
                n.put("conversationId", conversationId.toString());
                n.put("title", "Assisted change request");
                n.put("actionType", "GENERIC");
                n.put("targetEntityType", "UNSPECIFIED");
                n.put(
                        "payloadJson",
                        "{\"source\":\"conversation\",\"excerpt\":\""
                                + escapeJson(userContent != null ? userContent : "")
                                + "\"}");
            }
            default -> {
                // other tools accept empty object for MVP
            }
        }
        return n;
    }

    private static String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ");
    }

    private String writeJsonSafe(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node != null ? node : objectMapper.createObjectNode());
        } catch (Exception e) {
            return "{}";
        }
    }

    private List<LlmMessage> buildLlmMessages(String systemContext, UUID conversationId, List<String> toolOutputs) {
        List<AiMessage> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<LlmMessage> out = new ArrayList<>();
        out.add(new LlmMessage("system", systemContext));
        for (AiMessage m : history) {
            out.add(new LlmMessage(mapRole(m.getRole()), m.getContent() != null ? m.getContent() : ""));
        }
        if (!toolOutputs.isEmpty()) {
            out.add(
                    new LlmMessage(
                            "user",
                            "Tool outputs for this turn:\n" + String.join("\n\n", toolOutputs)));
        }
        return out;
    }

    private static String mapRole(MessageRole role) {
        if (role == null) {
            return "user";
        }
        return switch (role) {
            case USER -> "user";
            case ASSISTANT -> "assistant";
            case SYSTEM -> "system";
            case TOOL -> "user";
        };
    }

    private String buildWorkspaceContextString(Workspace workspace, int citationCount) {
        if (workspace == null) {
            return "Workspace context: (unknown)";
        }
        return "Workspace: "
                + workspace.getName()
                + " (id="
                + workspace.getId()
                + "). Market: "
                + (workspace.getMarket() != null ? workspace.getMarket() : "n/a")
                + ". Prior messages reference "
                + citationCount
                + " citation(s).";
    }

    private String summarizeConversationJson(AiConversation c) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", c.getId().toString());
            n.put("status", c.getStatus() != null ? c.getStatus().name() : null);
            n.put("title", c.getTitle());
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }
}
