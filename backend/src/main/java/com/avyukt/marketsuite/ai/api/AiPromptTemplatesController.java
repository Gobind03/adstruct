package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.*;
import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.ai.domain.AiPromptTemplate;
import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.avyukt.marketsuite.ai.domain.OutputFormat;
import com.avyukt.marketsuite.ai.domain.PromptScope;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import com.avyukt.marketsuite.ai.service.AiPromptService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/ai/prompts")
@Tag(name = "AI Prompts")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiPromptTemplatesController {

    private final AiPromptService promptService;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;
    private final ObjectMapper objectMapper;

    public AiPromptTemplatesController(
            AiPromptService promptService,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository,
            ObjectMapper objectMapper) {
        this.promptService = promptService;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List AI prompt templates")
    public ResponseEntity<List<AiPromptTemplateResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String scope,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String purpose,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String tag) {
        permissionService.requireOrgAccess(orgId);

        PromptScope scopeEnum = parseScope(scope);
        LlmCallPurpose purposeEnum = parsePurpose(purpose);
        PromptStatus statusEnum = parseStatus(status);

        List<AiPromptTemplate> base = promptService.list(orgId, scopeEnum, purposeEnum, statusEnum);
        List<AiPromptTemplate> filtered =
                base.stream()
                        .filter(
                                t ->
                                        workspaceId == null
                                                || (t.getWorkspace() != null
                                                        && workspaceId.equals(t.getWorkspace().getId())))
                        .filter(t -> tag == null || tag.isBlank() || templateHasTag(t, tag))
                        .toList();

        return ResponseEntity.ok(filtered.stream().map(this::toPromptTemplateResponse).toList());
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create AI prompt template")
    public ResponseEntity<AiPromptTemplateResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody AiPromptCreateRequest request) {
        if (request.workspaceId() != null) {
            Workspace ws = loadWorkspaceInOrg(orgId, request.workspaceId());
            permissionService.requireAiUse(orgId, ws.getId());
        } else {
            permissionService.requireAiOrgManagement(orgId);
        }

        PromptScope scope =
                request.scope() != null && !request.scope().isBlank()
                        ? PromptScope.valueOf(request.scope().trim().toUpperCase())
                        : PromptScope.ORG;
        Workspace workspace = null;
        if (request.workspaceId() != null) {
            workspace = loadWorkspaceInOrg(orgId, request.workspaceId());
        }
        if (scope == PromptScope.WORKSPACE && workspace == null) {
            throw new BusinessException("workspaceId is required for WORKSPACE-scoped prompts");
        }

        LlmCallPurpose purpose = LlmCallPurpose.valueOf(request.purpose().trim().toUpperCase());
        OutputFormat outputFormat =
                request.outputFormat() != null && !request.outputFormat().isBlank()
                        ? OutputFormat.valueOf(request.outputFormat().trim().toUpperCase())
                        : OutputFormat.TEXT;

        AiPromptTemplate template =
                AiPromptTemplate.builder()
                        .scope(scope)
                        .workspace(workspace)
                        .name(request.name())
                        .description(request.description())
                        .purpose(purpose)
                        .outputFormat(outputFormat)
                        .inputSchemaJson(request.inputSchemaJson())
                        .outputSchemaJson(request.outputSchemaJson())
                        .systemPrompt(request.systemPrompt())
                        .userPromptTemplate(request.userPromptTemplate())
                        .guardrailsText(request.guardrailsText())
                        .tags(
                                request.tags() != null && !request.tags().isBlank()
                                        ? request.tags()
                                        : "[]")
                        .build();

        AiPromptTemplate saved = promptService.create(orgId, template);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPromptTemplateResponse(saved));
    }

    @GetMapping("/{promptId}")
    @Operation(summary = "Get AI prompt template")
    public ResponseEntity<AiPromptTemplateResponse> get(
            @PathVariable UUID orgId, @PathVariable UUID promptId) {
        permissionService.requireOrgAccess(orgId);
        AiPromptTemplate t = promptService.get(promptId);
        assertPromptOrg(t, orgId);
        return ResponseEntity.ok(toPromptTemplateResponse(t));
    }

    @PatchMapping("/{promptId}")
    @Transactional
    @Operation(summary = "Patch AI prompt template")
    public ResponseEntity<AiPromptTemplateResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID promptId,
            @Valid @RequestBody AiPromptPatchRequest request) {
        permissionService.requireOrgAccess(orgId);
        AiPromptTemplate existing = promptService.get(promptId);
        assertPromptOrg(existing, orgId);

        Map<String, Object> updates = new LinkedHashMap<>();
        if (request.name() != null) {
            updates.put("name", request.name());
        }
        if (request.description() != null) {
            updates.put("description", request.description());
        }
        if (request.purpose() != null) {
            updates.put("purpose", request.purpose());
        }
        if (request.outputFormat() != null) {
            updates.put("outputFormat", request.outputFormat());
        }
        if (request.systemPrompt() != null) {
            updates.put("systemPrompt", request.systemPrompt());
        }
        if (request.userPromptTemplate() != null) {
            updates.put("userPromptTemplate", request.userPromptTemplate());
        }
        if (request.guardrailsText() != null) {
            updates.put("guardrailsText", request.guardrailsText());
        }
        if (request.tags() != null) {
            updates.put("tags", request.tags());
        }

        AiPromptTemplate saved = promptService.patch(promptId, updates.isEmpty() ? null : updates);
        return ResponseEntity.ok(toPromptTemplateResponse(saved));
    }

    @PostMapping("/{promptId}/submit")
    @Transactional
    @Operation(summary = "Submit AI prompt template for approval")
    public ResponseEntity<AiPromptTemplateResponse> submit(
            @PathVariable UUID orgId, @PathVariable UUID promptId) {
        permissionService.requireOrgAccess(orgId);
        assertPromptOrg(promptService.get(promptId), orgId);
        return ResponseEntity.ok(toPromptTemplateResponse(promptService.submit(promptId)));
    }

    @PostMapping("/{promptId}/approve")
    @Transactional
    @Operation(summary = "Approve AI prompt template")
    public ResponseEntity<AiPromptTemplateResponse> approve(
            @PathVariable UUID orgId, @PathVariable UUID promptId) {
        permissionService.requireAiOrgManagement(orgId);
        assertPromptOrg(promptService.get(promptId), orgId);
        return ResponseEntity.ok(toPromptTemplateResponse(promptService.approve(promptId)));
    }

    @PostMapping("/{promptId}/archive")
    @Transactional
    @Operation(summary = "Archive AI prompt template")
    public ResponseEntity<AiPromptTemplateResponse> archive(
            @PathVariable UUID orgId, @PathVariable UUID promptId) {
        permissionService.requireOrgAccess(orgId);
        assertPromptOrg(promptService.get(promptId), orgId);
        return ResponseEntity.ok(toPromptTemplateResponse(promptService.archive(promptId)));
    }

    @PostMapping("/{promptId}/run")
    @Transactional
    @Operation(summary = "Run AI prompt template in a workspace")
    public ResponseEntity<AiPromptRunResponse> run(
            @PathVariable UUID orgId,
            @PathVariable UUID promptId,
            @RequestParam UUID workspaceId,
            @Valid @RequestBody AiPromptRunRequest request) {
        Workspace ws = loadWorkspaceInOrg(orgId, workspaceId);
        permissionService.requireAiUse(orgId, ws.getId());
        assertPromptOrg(promptService.get(promptId), orgId);

        var run =
                promptService.run(
                        workspaceId,
                        promptId,
                        request.inputJson(),
                        request.providerOverrideId(),
                        request.modelOverride());
        return ResponseEntity.ok(toPromptRunResponse(run));
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

    private void assertPromptOrg(AiPromptTemplate t, UUID orgId) {
        if (!t.getOrg().getId().equals(orgId)) {
            throw new BusinessException("Prompt template does not belong to this organization");
        }
    }

    private static PromptScope parseScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return null;
        }
        return PromptScope.valueOf(scope.trim().toUpperCase());
    }

    private static LlmCallPurpose parsePurpose(String purpose) {
        if (purpose == null || purpose.isBlank()) {
            return null;
        }
        return LlmCallPurpose.valueOf(purpose.trim().toUpperCase());
    }

    private static PromptStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        return PromptStatus.valueOf(status.trim().toUpperCase());
    }

    private boolean templateHasTag(AiPromptTemplate t, String tag) {
        if (t.getTags() == null || t.getTags().isBlank()) {
            return false;
        }
        try {
            JsonNode root = objectMapper.readTree(t.getTags());
            if (!root.isArray()) {
                return false;
            }
            for (JsonNode n : root) {
                if (n != null && n.isTextual() && tag.equalsIgnoreCase(n.asText())) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private AiPromptTemplateResponse toPromptTemplateResponse(AiPromptTemplate t) {
        return new AiPromptTemplateResponse(
                t.getId(),
                t.getScope() != null ? t.getScope().name() : null,
                t.getOrg().getId(),
                t.getWorkspace() != null ? t.getWorkspace().getId() : null,
                t.getName(),
                t.getDescription(),
                t.getPurpose() != null ? t.getPurpose().name() : null,
                t.getStatus() != null ? t.getStatus().name() : null,
                t.getOutputFormat() != null ? t.getOutputFormat().name() : null,
                t.getInputSchemaJson(),
                t.getOutputSchemaJson(),
                t.getSystemPrompt(),
                t.getUserPromptTemplate(),
                t.getGuardrailsText(),
                t.getTags(),
                t.getVersion(),
                t.getParentTemplateId(),
                t.getCreatedByUser() != null ? t.getCreatedByUser().getId() : null,
                t.getUpdatedByUser() != null ? t.getUpdatedByUser().getId() : null,
                t.getCreatedAt(),
                t.getUpdatedAt());
    }

    private AiPromptRunResponse toPromptRunResponse(AiPromptRun r) {
        return new AiPromptRunResponse(
                r.getId(),
                r.getWorkspace().getId(),
                r.getPromptTemplate().getId(),
                r.getModel(),
                r.getOutputText(),
                r.getOutputJson(),
                r.getTokenUsageJson(),
                r.getLatencyMs(),
                r.getStatus(),
                null,
                r.getCreatedAt());
    }
}
