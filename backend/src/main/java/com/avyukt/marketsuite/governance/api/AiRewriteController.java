package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.ai.api.dto.AiRewriteRequest;
import com.avyukt.marketsuite.ai.api.dto.AiRewriteResponse;
import com.avyukt.marketsuite.ai.service.AiFacade;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/governance/ai")
@Tag(name = "Governance AI Rewrite")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiRewriteController {

    private static final String REWRITE_PROMPT_NAME = "rewrite-for-governance";

    private final AiFacade aiFacade;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;
    private final ObjectMapper objectMapper;

    public AiRewriteController(
            AiFacade aiFacade,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository,
            ObjectMapper objectMapper) {
        this.aiFacade = aiFacade;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/rewrite")
    @Transactional
    @Operation(summary = "Rewrite text for governance using approved AI prompt")
    public ResponseEntity<AiRewriteResponse> rewrite(
            @PathVariable UUID workspaceId, @Valid @RequestBody AiRewriteRequest request) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiUse(orgId, workspaceId);

        String inputJson = buildRewriteInputJson(request);
        var run = aiFacade.runPrompt(workspaceId, REWRITE_PROMPT_NAME, inputJson, null);
        String rewritten = run.getOutputText() != null ? run.getOutputText() : "";
        return ResponseEntity.ok(new AiRewriteResponse(request.text(), rewritten, run.getId()));
    }

    private String buildRewriteInputJson(AiRewriteRequest request) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("text", request.text());
            if (request.platformType() != null) {
                n.put("platformType", request.platformType());
            }
            if (request.language() != null) {
                n.put("language", request.language());
            }
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build rewrite input JSON", e);
        }
    }
}
