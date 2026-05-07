package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiWorkflowCreateRequest;
import com.avyukt.marketsuite.ai.api.dto.AiWorkflowDefinitionResponse;
import com.avyukt.marketsuite.ai.api.dto.AiWorkflowRunRequest;
import com.avyukt.marketsuite.ai.api.dto.AiWorkflowRunResponse;
import com.avyukt.marketsuite.ai.domain.AiWorkflowDefinition;
import com.avyukt.marketsuite.ai.domain.AiWorkflowRun;
import com.avyukt.marketsuite.ai.domain.PromptScope;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import com.avyukt.marketsuite.ai.repo.AiWorkflowDefinitionRepository;
import com.avyukt.marketsuite.ai.service.AiWorkflowService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/ai/workflows")
@Tag(name = "AI Workflows")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiWorkflowsController {

    private final AiWorkflowService workflowService;
    private final AiWorkflowDefinitionRepository workflowDefinitionRepository;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;

    public AiWorkflowsController(
            AiWorkflowService workflowService,
            AiWorkflowDefinitionRepository workflowDefinitionRepository,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository) {
        this.workflowService = workflowService;
        this.workflowDefinitionRepository = workflowDefinitionRepository;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
    }

    @GetMapping
    @Operation(summary = "List AI workflow definitions for organization")
    public ResponseEntity<List<AiWorkflowDefinitionResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String status) {
        permissionService.requireOrgAccess(orgId);
        if (workspaceId != null) {
            permissionService.requireAiUse(orgId, workspaceId);
        }
        PromptStatus st = null;
        if (status != null && !status.isBlank()) {
            st = PromptStatus.valueOf(status.trim().toUpperCase());
        }
        PromptScope scopeEnum = null;
        if (scope != null && !scope.isBlank()) {
            scopeEnum = PromptScope.valueOf(scope.trim().toUpperCase());
        }

        PromptScope scopeFilter = scopeEnum;
        UUID workspaceFilter = workspaceId;
        List<AiWorkflowDefinitionResponse> out =
                workflowService.list(orgId, st).stream()
                        .filter(w -> scopeFilter == null || w.getScope() == scopeFilter)
                        .filter(
                                w ->
                                        workspaceFilter == null
                                                || (w.getWorkspace() != null
                                                        && workspaceFilter.equals(w.getWorkspace().getId())))
                        .map(this::toWorkflowDefinitionResponse)
                        .toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create AI workflow definition")
    public ResponseEntity<AiWorkflowDefinitionResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody AiWorkflowCreateRequest request) {
        permissionService.requireAiOrgManagement(orgId);

        PromptScope defScope =
                request.scope() != null && !request.scope().isBlank()
                        ? PromptScope.valueOf(request.scope().trim().toUpperCase())
                        : PromptScope.ORG;

        Workspace ws = null;
        if (request.workspaceId() != null) {
            ws =
                    workspaceRepository
                            .findById(request.workspaceId())
                            .orElseThrow(
                                    () -> new ResourceNotFoundException("Workspace", "id", request.workspaceId()));
            if (!ws.getOrg().getId().equals(orgId)) {
                throw new BusinessException("Workspace does not belong to this organization");
            }
        }
        if (defScope == PromptScope.WORKSPACE && ws == null) {
            throw new BusinessException("workspaceId is required for WORKSPACE-scoped workflows");
        }

        AiWorkflowDefinition def =
                AiWorkflowDefinition.builder()
                        .scope(defScope)
                        .workspace(ws)
                        .name(request.name())
                        .description(request.description())
                        .stepsJson(request.stepsJson())
                        .build();

        AiWorkflowDefinition saved = workflowService.create(orgId, def);
        return ResponseEntity.status(HttpStatus.CREATED).body(toWorkflowDefinitionResponse(saved));
    }

    @PostMapping("/{workflowId}/run")
    @Transactional
    @Operation(summary = "Run AI workflow in a workspace")
    public ResponseEntity<AiWorkflowRunResponse> run(
            @PathVariable UUID orgId,
            @PathVariable UUID workflowId,
            @RequestParam UUID workspaceId,
            @Valid @RequestBody AiWorkflowRunRequest request) {
        Workspace ws = loadWorkspaceInOrg(orgId, workspaceId);
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AiWorkflowDefinition def =
                workflowDefinitionRepository
                        .findById(workflowId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiWorkflowDefinition", "id", workflowId));
        assertWorkflowOrg(def, orgId);

        AiWorkflowRun run =
                workflowService.run(workspaceId, workflowId, request.inputJson(), request.conversationId());
        return ResponseEntity.ok(toWorkflowRunResponse(run));
    }

    private Workspace loadWorkspaceInOrg(UUID orgId, UUID workspaceId) {
        Workspace ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        if (!ws.getOrg().getId().equals(orgId)) {
            throw new BusinessException("Workspace does not belong to this organization");
        }
        return ws;
    }

    private void assertWorkflowOrg(AiWorkflowDefinition def, UUID orgId) {
        if (!def.getOrg().getId().equals(orgId)) {
            throw new BusinessException("Workflow does not belong to this organization");
        }
    }

    private AiWorkflowDefinitionResponse toWorkflowDefinitionResponse(AiWorkflowDefinition d) {
        return new AiWorkflowDefinitionResponse(
                d.getId(),
                d.getScope() != null ? d.getScope().name() : null,
                d.getOrg().getId(),
                d.getWorkspace() != null ? d.getWorkspace().getId() : null,
                d.getName(),
                d.getDescription(),
                d.getStepsJson(),
                d.getStatus() != null ? d.getStatus().name() : null,
                d.getCreatedAt(),
                d.getUpdatedAt());
    }

    private AiWorkflowRunResponse toWorkflowRunResponse(AiWorkflowRun r) {
        return new AiWorkflowRunResponse(
                r.getId(),
                r.getWorkflowDefinition().getId(),
                r.getWorkspace().getId(),
                r.getConversation() != null ? r.getConversation().getId() : null,
                r.getInputJson(),
                r.getOutputJson(),
                r.getStatus(),
                r.getErrorMessage(),
                r.getCreatedAt());
    }
}
