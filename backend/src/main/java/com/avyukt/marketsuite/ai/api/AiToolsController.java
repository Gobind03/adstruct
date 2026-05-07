package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiToolDefinitionResponse;
import com.avyukt.marketsuite.ai.domain.AiToolDefinition;
import com.avyukt.marketsuite.ai.repo.AiToolDefinitionRepository;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/ai/tools")
@Tag(name = "AI Tools")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiToolsController {

    private final AiToolDefinitionRepository toolDefinitionRepository;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;

    public AiToolsController(
            AiToolDefinitionRepository toolDefinitionRepository,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository) {
        this.toolDefinitionRepository = toolDefinitionRepository;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
    }

    @GetMapping
    @Operation(summary = "List enabled AI tool definitions")
    public ResponseEntity<List<AiToolDefinitionResponse>> list(@PathVariable UUID workspaceId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);
        List<AiToolDefinitionResponse> out =
                toolDefinitionRepository.findByEnabledTrue().stream().map(this::toToolDefinitionResponse).toList();
        return ResponseEntity.ok(out);
    }

    private AiToolDefinitionResponse toToolDefinitionResponse(AiToolDefinition d) {
        return new AiToolDefinitionResponse(
                d.getId(),
                d.getName(),
                d.getDescription(),
                d.getRiskLevel() != null ? d.getRiskLevel().name() : null,
                d.getInputSchemaJson(),
                d.getOutputSchemaJson(),
                d.isEnabled());
    }
}
