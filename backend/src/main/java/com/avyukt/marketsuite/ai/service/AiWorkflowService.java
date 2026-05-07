package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AiWorkflowDefinition;
import com.avyukt.marketsuite.ai.domain.AiWorkflowRun;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import com.avyukt.marketsuite.ai.domain.SafetyDecision;
import com.avyukt.marketsuite.ai.repo.AiActionProposalRepository;
import com.avyukt.marketsuite.ai.repo.AiConversationRepository;
import com.avyukt.marketsuite.ai.repo.AiWorkflowDefinitionRepository;
import com.avyukt.marketsuite.ai.repo.AiWorkflowRunRepository;
import com.avyukt.marketsuite.ai.service.safety.AiSafetyService;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.ai.service.tools.ToolRegistry;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.avyukt.marketsuite.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AiWorkflowService {

    private final AiWorkflowDefinitionRepository workflowDefinitionRepository;
    private final AiWorkflowRunRepository workflowRunRepository;
    private final AiPromptService aiPromptService;
    private final ToolRegistry toolRegistry;
    private final AiSafetyService safetyService;
    private final AiConversationService aiConversationService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final OrganizationRepository organizationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final AiActionProposalRepository actionProposalRepository;
    private final AiConversationRepository conversationRepository;

    public AiWorkflowService(
            AiWorkflowDefinitionRepository workflowDefinitionRepository,
            AiWorkflowRunRepository workflowRunRepository,
            AiPromptService aiPromptService,
            ToolRegistry toolRegistry,
            AiSafetyService safetyService,
            AiConversationService aiConversationService,
            AuditService auditService,
            ObjectMapper objectMapper,
            OrganizationRepository organizationRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            AiActionProposalRepository actionProposalRepository,
            AiConversationRepository conversationRepository) {
        this.workflowDefinitionRepository = workflowDefinitionRepository;
        this.workflowRunRepository = workflowRunRepository;
        this.aiPromptService = aiPromptService;
        this.toolRegistry = toolRegistry;
        this.safetyService = safetyService;
        this.aiConversationService = aiConversationService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
        this.organizationRepository = organizationRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.actionProposalRepository = actionProposalRepository;
        this.conversationRepository = conversationRepository;
    }

    @Transactional(readOnly = true)
    public List<AiWorkflowDefinition> list(UUID orgId, PromptStatus status) {
        if (orgId == null) {
            throw new BusinessException("orgId is required");
        }
        if (status != null) {
            return workflowDefinitionRepository.findByOrgIdAndStatus(orgId, status);
        }
        return workflowDefinitionRepository.findByOrgId(orgId);
    }

    public AiWorkflowDefinition create(UUID orgId, AiWorkflowDefinition def) {
        UUID actorId = SecurityUtils.currentUserId();
        Organization org =
                organizationRepository
                        .findById(orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
        def.setOrg(org);
        AiWorkflowDefinition saved = workflowDefinitionRepository.save(def);
        auditService.log(
                orgId,
                def.getWorkspace() != null ? def.getWorkspace().getId() : null,
                actorId,
                "AI_WORKFLOW_DEFINITION_CREATE",
                "AiWorkflowDefinition",
                saved.getId(),
                null,
                summarizeWorkflowDef(saved));
        return saved;
    }

    public AiWorkflowRun run(UUID workspaceId, UUID workflowId, String inputJson, UUID conversationId) {
        UUID actorId = SecurityUtils.currentUserId();
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));

        AiWorkflowDefinition def =
                workflowDefinitionRepository
                        .findById(workflowId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiWorkflowDefinition", "id", workflowId));

        AiConversation conversation = null;
        if (conversationId != null) {
            aiConversationService.getMessages(conversationId);
            conversation =
                    conversationRepository
                            .findById(conversationId)
                            .orElseThrow(() -> new ResourceNotFoundException("AiConversation", "id", conversationId));
            if (!conversation.getWorkspace().getId().equals(workspaceId)) {
                throw new BusinessException("Conversation does not belong to the workspace");
            }
        }

        JsonNode inputRoot = parseInputJson(inputJson);

        AiWorkflowRun run =
                AiWorkflowRun.builder()
                        .workflowDefinition(def)
                        .workspace(workspace)
                        .conversation(conversation)
                        .inputJson(inputJson != null && !inputJson.isBlank() ? inputJson : "{}")
                        .status("RUNNING")
                        .build();
        run = workflowRunRepository.save(run);

        if (safetyService.classifySafety(workspaceId, inputJson != null ? inputJson : "") == SafetyDecision.BLOCK) {
            run.setStatus("FAILED");
            run.setErrorMessage("Workflow input blocked by workspace safety policy");
            run = workflowRunRepository.save(run);
            auditService.log(
                    workspace.getOrg().getId(),
                    workspaceId,
                    actorId,
                    "AI_WORKFLOW_RUN_FAILED",
                    "AiWorkflowRun",
                    run.getId(),
                    null,
                    "{\"status\":\"FAILED\",\"error\":\"safety_block\"}");
            return run;
        }

        ArrayNode stepResults = objectMapper.createArrayNode();
        try {
            JsonNode steps = objectMapper.readTree(def.getStepsJson());
            if (!steps.isArray()) {
                throw new BusinessException("Workflow stepsJson must be a JSON array");
            }
            int index = 0;
            for (JsonNode step : steps) {
                ObjectNode one = objectMapper.createObjectNode();
                one.put("index", index++);
                one.set("step", step);
                String type = step.path("type").asText("").trim().toUpperCase();
                switch (type) {
                    case "TOOL" -> one.set("output", executeToolStep(workspaceId, step, inputRoot));
                    case "LLM" -> one.set("output", executeLlmStep(workspaceId, step, inputRoot));
                    case "PROPOSE_ACTION" -> one.set("output", executeProposeStep(workspace, conversation, step, inputRoot));
                    default -> throw new BusinessException("Unknown workflow step type: " + type);
                }
                stepResults.add(one);
            }
            ObjectNode outputRoot = objectMapper.createObjectNode();
            outputRoot.set("steps", stepResults);
            run.setOutputJson(objectMapper.writeValueAsString(outputRoot));
            run.setStatus("SUCCESS");
            run = workflowRunRepository.save(run);
        } catch (BusinessException e) {
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage());
            run = workflowRunRepository.save(run);
            try {
                ObjectNode audit = objectMapper.createObjectNode();
                audit.put("status", "FAILED");
                audit.put("error", e.getMessage() != null ? e.getMessage() : "");
                auditService.log(
                        workspace.getOrg().getId(),
                        workspaceId,
                        actorId,
                        "AI_WORKFLOW_RUN_FAILED",
                        "AiWorkflowRun",
                        run.getId(),
                        null,
                        objectMapper.writeValueAsString(audit));
            } catch (Exception auditEx) {
                log.warn("Audit log failed after workflow business error: {}", auditEx.getMessage());
            }
            return run;
        } catch (Exception e) {
            log.error("Workflow run failed: {}", e.getMessage(), e);
            run.setStatus("FAILED");
            run.setErrorMessage(e.getMessage() != null ? e.getMessage() : "Workflow failed");
            run = workflowRunRepository.save(run);
            try {
                auditService.log(
                        workspace.getOrg().getId(),
                        workspaceId,
                        actorId,
                        "AI_WORKFLOW_RUN_FAILED",
                        "AiWorkflowRun",
                        run.getId(),
                        null,
                        "{\"status\":\"FAILED\"}");
            } catch (Exception auditEx) {
                log.warn("Audit log failed after workflow error: {}", auditEx.getMessage());
            }
            return run;
        }

        auditService.log(
                workspace.getOrg().getId(),
                workspaceId,
                actorId,
                "AI_WORKFLOW_RUN",
                "AiWorkflowRun",
                run.getId(),
                null,
                "{\"status\":\"" + run.getStatus() + "\"}");
        return run;
    }

    private JsonNode executeToolStep(UUID workspaceId, JsonNode step, JsonNode inputRoot) {
        String toolName = step.path("toolName").asText(null);
        if (toolName == null || toolName.isBlank()) {
            throw new BusinessException("TOOL step requires toolName");
        }
        String inputTemplate = step.path("inputTemplate").asText("{}");
        String expanded = expandPlaceholders(inputTemplate, inputRoot);
        JsonNode inputNode;
        try {
            inputNode = objectMapper.readTree(expanded);
        } catch (Exception e) {
            throw new BusinessException("Invalid tool input JSON after template expansion: " + e.getMessage());
        }
        Optional<AiTool> toolOpt = toolRegistry.getTool(toolName);
        if (toolOpt.isEmpty()) {
            throw new BusinessException("Unknown tool: " + toolName);
        }
        AiTool tool = toolOpt.get();
        UserPrincipal principal = SecurityUtils.currentUser();
        List<String> roles =
                principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toList());
        Workspace ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        AiToolContext ctx =
                new AiToolContext(
                        workspaceId,
                        ws.getOrg().getId(),
                        principal.getId(),
                        roles,
                        UUID.randomUUID().toString());
        return tool.execute(ctx, inputNode);
    }

    private JsonNode executeLlmStep(UUID workspaceId, JsonNode step, JsonNode inputRoot) {
        String promptIdStr = step.path("promptId").asText(null);
        if (promptIdStr == null || promptIdStr.isBlank()) {
            throw new BusinessException("LLM step requires promptId");
        }
        UUID promptId;
        try {
            promptId = UUID.fromString(promptIdStr.trim());
        } catch (Exception e) {
            throw new BusinessException("LLM step promptId must be a UUID");
        }
        String inputTemplate = step.path("inputTemplate").asText("{}");
        String expandedInput = expandPlaceholders(inputTemplate, inputRoot);
        var run = aiPromptService.run(workspaceId, promptId, expandedInput, null, null);
        ObjectNode out = objectMapper.createObjectNode();
        out.put("promptRunId", run.getId().toString());
        out.put("outputText", run.getOutputText() != null ? run.getOutputText() : "");
        return out;
    }

    private JsonNode executeProposeStep(
            Workspace workspace, AiConversation conversation, JsonNode step, JsonNode inputRoot) {
        if (conversation == null) {
            throw new BusinessException("PROPOSE_ACTION step requires a conversationId on the workflow run");
        }
        String title = expandPlaceholders(step.path("titleTemplate").asText("Workflow action"), inputRoot);
        String actionType = expandPlaceholders(step.path("actionType").asText("WORKFLOW"), inputRoot);
        String targetEntityType =
                expandPlaceholders(step.path("targetEntityType").asText("UNSPECIFIED"), inputRoot);
        String targetIdExpanded = expandPlaceholders(step.path("targetEntityIdTemplate").asText(""), inputRoot);
        UUID targetEntityId = null;
        if (targetIdExpanded != null && !targetIdExpanded.isBlank()) {
            try {
                targetEntityId = UUID.fromString(targetIdExpanded.trim());
            } catch (Exception e) {
                log.debug("targetEntityIdTemplate did not expand to a UUID: {}", targetIdExpanded);
            }
        }
        String payloadTemplate = step.path("payloadTemplate").asText("{}");
        String payloadJson = expandPlaceholders(payloadTemplate, inputRoot);
        if (payloadJson == null || payloadJson.isBlank()) {
            payloadJson = "{}";
        }

        UUID userId = SecurityUtils.currentUserId();
        AppUser requester =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        AiActionProposal proposal =
                AiActionProposal.builder()
                        .workspace(workspace)
                        .conversation(conversation)
                        .title(title)
                        .description(step.path("descriptionTemplate").isMissingNode()
                                ? null
                                : expandPlaceholders(step.path("descriptionTemplate").asText(), inputRoot))
                        .actionType(actionType)
                        .targetEntityType(targetEntityType)
                        .targetEntityId(targetEntityId)
                        .payloadJson(payloadJson)
                        .status(AgentActionStatus.PROPOSED)
                        .requestedByUser(requester)
                        .build();
        AiActionProposal saved = actionProposalRepository.save(proposal);
        ObjectNode out = objectMapper.createObjectNode();
        out.put("proposalId", saved.getId().toString());
        return out;
    }

    private JsonNode parseInputJson(String inputJson) {
        if (inputJson == null || inputJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(inputJson);
        } catch (Exception e) {
            throw new BusinessException("Invalid workflow input JSON: " + e.getMessage());
        }
    }

    private String expandPlaceholders(String template, JsonNode inputRoot) {
        if (template == null) {
            return "";
        }
        if (inputRoot == null || inputRoot.isNull()) {
            return template;
        }
        String out = template;
        Iterator<String> names = inputRoot.fieldNames();
        while (names.hasNext()) {
            String key = names.next();
            JsonNode node = inputRoot.get(key);
            String value;
            if (node == null || node.isNull()) {
                value = "";
            } else if (node.isTextual()) {
                value = node.asText();
            } else {
                value = node.toString();
            }
            out = out.replace("{{" + key + "}}", value);
        }
        return out;
    }

    private String summarizeWorkflowDef(AiWorkflowDefinition d) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", d.getId().toString());
            n.put("name", d.getName());
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }
}
