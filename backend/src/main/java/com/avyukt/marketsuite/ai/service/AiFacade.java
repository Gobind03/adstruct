package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AgentMode;
import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AiMessage;
import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.ai.domain.AiPromptTemplate;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import com.avyukt.marketsuite.ai.repo.AiActionProposalRepository;
import com.avyukt.marketsuite.ai.repo.AiConversationRepository;
import com.avyukt.marketsuite.ai.repo.AiPromptTemplateRepository;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cross-module entry points for AI capabilities (prompt runs, chat, proposals).
 */
@Service
@Transactional
@Slf4j
public class AiFacade {

    private final AiConversationService aiConversationService;
    private final AiPromptService aiPromptService;
    private final AiActionProposalService aiActionProposalService;
    private final AiPromptTemplateRepository aiPromptTemplateRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AiConversationRepository aiConversationRepository;
    private final AiActionProposalRepository aiActionProposalRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AiFacade(
            AiConversationService aiConversationService,
            AiPromptService aiPromptService,
            AiActionProposalService aiActionProposalService,
            AiPromptTemplateRepository aiPromptTemplateRepository,
            WorkspaceRepository workspaceRepository,
            AiConversationRepository aiConversationRepository,
            AiActionProposalRepository aiActionProposalRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.aiConversationService = aiConversationService;
        this.aiPromptService = aiPromptService;
        this.aiActionProposalService = aiActionProposalService;
        this.aiPromptTemplateRepository = aiPromptTemplateRepository;
        this.workspaceRepository = workspaceRepository;
        this.aiConversationRepository = aiConversationRepository;
        this.aiActionProposalRepository = aiActionProposalRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public AiPromptRun runPrompt(
            UUID workspaceId, String promptNameOrId, String inputJson, Map<String, String> context) {
        AiPromptTemplate template = resolveApprovedPrompt(workspaceId, promptNameOrId);
        String merged = mergeInputWithContext(inputJson, context);
        return aiPromptService.run(workspaceId, template.getId(), merged, null, null);
    }

    public UUID startConversation(UUID workspaceId, String title, Map<String, String> context) {
        AiConversation created =
                aiConversationService.create(workspaceId, title, AgentMode.TOOL_ASSISTED, null, null);
        if (context != null && !context.isEmpty()) {
            try {
                created.setContextJson(objectMapper.writeValueAsString(context));
                aiConversationRepository.save(created);
            } catch (Exception e) {
                log.warn("Could not persist conversation context JSON: {}", e.getMessage());
            }
        }
        return created.getId();
    }

    public AiMessage appendMessage(UUID conversationId, String userMessage) {
        return aiConversationService.postMessage(conversationId, userMessage);
    }

    public AiActionProposal proposeAction(
            UUID workspaceId,
            UUID conversationId,
            String title,
            String actionType,
            String targetEntityType,
            UUID targetEntityId,
            String payloadJson) {
        UUID userId = SecurityUtils.currentUserId();
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        AiConversation conversation =
                aiConversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
        if (!conversation.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Conversation does not belong to the workspace");
        }
        AppUser requester =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        String payload = payloadJson != null && !payloadJson.isBlank() ? payloadJson : "{}";
        AiActionProposal proposal =
                AiActionProposal.builder()
                        .workspace(workspace)
                        .conversation(conversation)
                        .title(title != null ? title : "Action proposal")
                        .actionType(actionType != null ? actionType : "GENERIC")
                        .targetEntityType(targetEntityType != null ? targetEntityType : "UNSPECIFIED")
                        .targetEntityId(targetEntityId)
                        .payloadJson(payload)
                        .status(AgentActionStatus.PROPOSED)
                        .requestedByUser(requester)
                        .build();
        return aiActionProposalRepository.save(proposal);
    }

    private AiPromptTemplate resolveApprovedPrompt(UUID workspaceId, String promptNameOrId) {
        if (promptNameOrId == null || promptNameOrId.isBlank()) {
            throw new BusinessException("promptNameOrId is required");
        }
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();

        UUID asUuid = tryParseUuid(promptNameOrId.trim());
        if (asUuid != null) {
            AiPromptTemplate byId =
                    aiPromptTemplateRepository
                            .findById(asUuid)
                            .orElseThrow(() -> new ResourceNotFoundException("AiPromptTemplate", "id", asUuid));
            if (!byId.getOrg().getId().equals(orgId)) {
                throw new BusinessException("Prompt template is not in this workspace's organization");
            }
            if (byId.getStatus() != PromptStatus.APPROVED) {
                throw new BusinessException("Prompt template is not approved");
            }
            return byId;
        }

        String name = promptNameOrId.trim();
        return aiPromptTemplateRepository.findByOrgId(orgId).stream()
                .filter(t -> name.equals(t.getName()) && t.getStatus() == PromptStatus.APPROVED)
                .max(Comparator.comparingInt(AiPromptTemplate::getVersion))
                .orElseThrow(
                        () ->
                                new ResourceNotFoundException(
                                        "AiPromptTemplate", "name (APPROVED)", name));
    }

    private static UUID tryParseUuid(String s) {
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String mergeInputWithContext(String inputJson, Map<String, String> context) {
        try {
            ObjectNode base;
            if (inputJson == null || inputJson.isBlank()) {
                base = objectMapper.createObjectNode();
            } else {
                base = (ObjectNode) objectMapper.readTree(inputJson);
            }
            if (context != null) {
                context.forEach(
                        (k, v) -> {
                            if (k != null && !k.isBlank() && v != null && !base.has(k)) {
                                base.put(k, v);
                            }
                        });
            }
            return objectMapper.writeValueAsString(base);
        } catch (Exception e) {
            throw new BusinessException("Invalid inputJson for prompt run: " + e.getMessage());
        }
    }
}
