package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.*;
import com.avyukt.marketsuite.ai.domain.AgentMode;
import com.avyukt.marketsuite.ai.domain.AiCitation;
import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AiMessage;
import com.avyukt.marketsuite.ai.domain.AiToolCall;
import com.avyukt.marketsuite.ai.domain.MessageRole;
import com.avyukt.marketsuite.ai.repo.AiCitationRepository;
import com.avyukt.marketsuite.ai.repo.AiConversationRepository;
import com.avyukt.marketsuite.ai.repo.AiMessageRepository;
import com.avyukt.marketsuite.ai.repo.AiToolCallRepository;
import com.avyukt.marketsuite.ai.service.AiConversationService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/ai/conversations")
@Tag(name = "AI Conversations")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiConversationsController {

    private final AiConversationService conversationService;
    private final PermissionService permissionService;
    private final AiConversationRepository conversationRepository;
    private final AiMessageRepository messageRepository;
    private final AiToolCallRepository toolCallRepository;
    private final AiCitationRepository citationRepository;
    private final WorkspaceRepository workspaceRepository;

    public AiConversationsController(
            AiConversationService conversationService,
            PermissionService permissionService,
            AiConversationRepository conversationRepository,
            AiMessageRepository messageRepository,
            AiToolCallRepository toolCallRepository,
            AiCitationRepository citationRepository,
            WorkspaceRepository workspaceRepository) {
        this.conversationService = conversationService;
        this.permissionService = permissionService;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.toolCallRepository = toolCallRepository;
        this.citationRepository = citationRepository;
        this.workspaceRepository = workspaceRepository;
    }

    @GetMapping
    @Operation(summary = "List AI conversations for workspace")
    public ResponseEntity<List<AiConversationResponse>> list(@PathVariable UUID workspaceId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);
        List<AiConversationResponse> out =
                conversationRepository.findByWorkspaceIdOrderByUpdatedAtDesc(workspaceId).stream()
                        .map(this::toConversationResponse)
                        .toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create AI conversation")
    public ResponseEntity<AiConversationResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody AiConversationCreateRequest request) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AgentMode mode =
                request.agentMode() != null && !request.agentMode().isBlank()
                        ? AgentMode.valueOf(request.agentMode().trim().toUpperCase())
                        : AgentMode.TOOL_ASSISTED;

        AiConversation created =
                conversationService.create(
                        workspaceId, request.title(), mode, request.providerConfigId(), request.model());
        if (request.contextJson() != null && !request.contextJson().isBlank()) {
            created.setContextJson(request.contextJson());
            created = conversationRepository.save(created);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(toConversationResponse(created));
    }

    @GetMapping("/{conversationId}")
    @Operation(summary = "Get AI conversation with messages")
    public ResponseEntity<AiConversationWithMessagesResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID conversationId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AiConversation conv =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
        assertConversationWorkspace(conv, workspaceId);

        List<AiMessage> messages = conversationService.getMessages(conversationId);
        List<UUID> messageIds = messages.stream().map(AiMessage::getId).toList();
        Map<UUID, List<AiCitation>> citationsByMessage = new HashMap<>();
        if (!messageIds.isEmpty()) {
            for (AiCitation c : citationRepository.findByMessageIdIn(messageIds)) {
                UUID mid = c.getMessage().getId();
                citationsByMessage.computeIfAbsent(mid, k -> new ArrayList<>()).add(c);
            }
        }

        List<AiMessageResponse> messageResponses =
                messages.stream()
                        .map(
                                m ->
                                        toMessageResponse(
                                                m,
                                                citationsByMessage.getOrDefault(m.getId(), List.of()).stream()
                                                        .map(this::toCitationResponse)
                                                        .toList()))
                        .toList();

        return ResponseEntity.ok(
                new AiConversationWithMessagesResponse(toConversationResponse(conv), messageResponses));
    }

    @PostMapping("/{conversationId}/messages")
    @Transactional
    @Operation(summary = "Post user message and receive assistant reply")
    public ResponseEntity<PostMessageResponse> postMessage(
            @PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,
            @Valid @RequestBody AiMessageCreateRequest request) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AiConversation conv =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
        assertConversationWorkspace(conv, workspaceId);

        AiMessage assistant = conversationService.postMessage(conversationId, request.content());

        List<AiMessage> ordered = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        UUID userTurnMessageId = resolveUserTurnMessageId(ordered, assistant);

        List<AiToolCallResponse> toolCallResponses =
                toolCallRepository.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                        .filter(
                                tc ->
                                        userTurnMessageId != null
                                                && tc.getMessage() != null
                                                && userTurnMessageId.equals(tc.getMessage().getId()))
                        .map(this::toToolCallResponse)
                        .toList();

        List<AiCitationResponse> citationResponses =
                citationRepository.findByMessageId(assistant.getId()).stream()
                        .map(this::toCitationResponse)
                        .toList();

        return ResponseEntity.ok(
                new PostMessageResponse(
                        toMessageResponse(assistant, citationResponses),
                        toolCallResponses,
                        citationResponses));
    }

    @PostMapping("/{conversationId}/archive")
    @Transactional
    @Operation(summary = "Archive AI conversation")
    public ResponseEntity<Void> archive(
            @PathVariable UUID workspaceId, @PathVariable UUID conversationId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AiConversation conv =
                conversationRepository
                        .findById(conversationId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
        assertConversationWorkspace(conv, workspaceId);

        conversationService.archive(conversationId);
        return ResponseEntity.ok().build();
    }

    private void assertConversationWorkspace(AiConversation conv, UUID workspaceId) {
        if (!conv.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Conversation does not belong to this workspace");
        }
    }

    private static UUID resolveUserTurnMessageId(List<AiMessage> ordered, AiMessage assistant) {
        if (ordered == null || ordered.size() < 2) {
            return null;
        }
        AiMessage last = ordered.get(ordered.size() - 1);
        if (!last.getId().equals(assistant.getId())) {
            return null;
        }
        if (last.getRole() != MessageRole.ASSISTANT) {
            return null;
        }
        AiMessage prev = ordered.get(ordered.size() - 2);
        if (prev.getRole() == MessageRole.USER) {
            return prev.getId();
        }
        return null;
    }

    private AiConversationResponse toConversationResponse(AiConversation c) {
        return new AiConversationResponse(
                c.getId(),
                c.getWorkspace().getId(),
                c.getTitle(),
                c.getStatus() != null ? c.getStatus().name() : null,
                c.getAgentMode() != null ? c.getAgentMode().name() : null,
                c.getProviderConfig() != null ? c.getProviderConfig().getId() : null,
                c.getModel(),
                c.getContextJson(),
                c.getCreatedByUser() != null ? c.getCreatedByUser().getId() : null,
                c.getCreatedAt(),
                c.getUpdatedAt());
    }

    private AiMessageResponse toMessageResponse(AiMessage m, List<AiCitationResponse> citations) {
        return new AiMessageResponse(
                m.getId(),
                m.getConversation().getId(),
                m.getRole() != null ? m.getRole().name() : null,
                m.getContent(),
                m.getContentJson(),
                m.getCreatedByUser() != null ? m.getCreatedByUser().getId() : null,
                m.getCreatedAt(),
                citations != null ? citations : List.of());
    }

    private AiToolCallResponse toToolCallResponse(AiToolCall tc) {
        return new AiToolCallResponse(
                tc.getId(),
                tc.getConversation().getId(),
                tc.getToolName(),
                tc.getStatus() != null ? tc.getStatus().name() : null,
                tc.getInputJson(),
                tc.getOutputJson(),
                tc.getErrorMessage(),
                tc.getStartedAt(),
                tc.getFinishedAt(),
                tc.getCreatedAt());
    }

    private AiCitationResponse toCitationResponse(AiCitation c) {
        return new AiCitationResponse(
                c.getId(),
                c.getCitationType() != null ? c.getCitationType().name() : null,
                c.getReferenceType(),
                c.getReferenceId(),
                c.getUrl(),
                c.getLabel(),
                c.getMetaJson(),
                c.getCreatedAt());
    }
}
