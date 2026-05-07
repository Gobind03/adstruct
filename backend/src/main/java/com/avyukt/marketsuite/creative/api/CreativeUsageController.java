package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeUsageRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeUsageResponse;
import com.avyukt.marketsuite.creative.service.CreativeUsageService;
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
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/usage")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeUsageController {

    private final CreativeUsageService creativeUsageService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeUsageController(
            CreativeUsageService creativeUsageService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeUsageService = creativeUsageService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @PostMapping
    @Operation(summary = "Create creative usage record")
    public ResponseEntity<CreativeUsageResponse> createUsage(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreativeUsageRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeUsageService.create(workspaceId, request));
    }

    @GetMapping
    @Operation(summary = "List creative usage records")
    public ResponseEntity<List<CreativeUsageResponse>> listUsage(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String creativeEntityType,
            @RequestParam(required = false) UUID creativeEntityId,
            @RequestParam(required = false) String usedEntityType,
            @RequestParam(required = false) UUID usedEntityId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        boolean hasCreative = creativeEntityType != null && !creativeEntityType.isBlank() && creativeEntityId != null;
        boolean hasUsed = usedEntityType != null && !usedEntityType.isBlank() && usedEntityId != null;
        if (hasCreative && hasUsed) {
            throw new BusinessException("Specify either creative or used entity filters, not both");
        }
        if (hasCreative) {
            return ResponseEntity.ok(
                    creativeUsageService.listByCreative(workspaceId, creativeEntityType, creativeEntityId));
        }
        if (hasUsed) {
            return ResponseEntity.ok(creativeUsageService.listByUsedEntity(workspaceId, usedEntityType, usedEntityId));
        }
        return ResponseEntity.ok(creativeUsageService.listAll(workspaceId));
    }
}
