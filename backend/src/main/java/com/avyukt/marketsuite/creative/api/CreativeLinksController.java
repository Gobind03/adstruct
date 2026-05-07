package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeLinkRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeLinkResponse;
import com.avyukt.marketsuite.creative.service.CreativeLinkService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/links")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeLinksController {

    private final CreativeLinkService creativeLinkService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeLinksController(
            CreativeLinkService creativeLinkService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeLinkService = creativeLinkService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @PostMapping
    @Operation(summary = "Create creative link")
    public ResponseEntity<CreativeLinkResponse> createLink(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreativeLinkRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeLinkService.create(workspaceId, request));
    }

    @GetMapping
    @Operation(summary = "List creative links")
    public ResponseEntity<List<CreativeLinkResponse>> listLinks(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String fromEntityType,
            @RequestParam(required = false) UUID fromEntityId,
            @RequestParam(required = false) String toEntityType,
            @RequestParam(required = false) UUID toEntityId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        boolean hasFrom = fromEntityType != null && !fromEntityType.isBlank() && fromEntityId != null;
        boolean hasTo = toEntityType != null && !toEntityType.isBlank() && toEntityId != null;
        if (hasFrom && hasTo) {
            throw new BusinessException("Specify either from or to entity filters, not both");
        }
        if (hasFrom) {
            return ResponseEntity.ok(creativeLinkService.listFrom(workspaceId, fromEntityType, fromEntityId));
        }
        if (hasTo) {
            return ResponseEntity.ok(creativeLinkService.listTo(workspaceId, toEntityType, toEntityId));
        }
        return ResponseEntity.ok(creativeLinkService.listAll(workspaceId));
    }

    @DeleteMapping("/{linkId}")
    @Operation(summary = "Delete creative link")
    public ResponseEntity<Void> deleteLink(
            @PathVariable UUID workspaceId, @PathVariable UUID linkId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        creativeLinkService.delete(workspaceId, linkId);
        return ResponseEntity.noContent().build();
    }
}
