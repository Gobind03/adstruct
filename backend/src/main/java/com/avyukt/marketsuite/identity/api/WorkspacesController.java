package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.WorkspaceCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceResponse;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceUpdateRequest;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.identity.service.WorkspaceService;
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
@RequestMapping("/api/v1/organizations/{orgId}/workspaces")
@Tag(name = "Workspaces")
@SecurityRequirement(name = "bearerAuth")
public class WorkspacesController {

    private final WorkspaceService service;
    private final PermissionService permissionService;

    public WorkspacesController(WorkspaceService service, PermissionService permissionService) {
        this.service = service;
        this.permissionService = permissionService;
    }

    @PostMapping
    @Operation(summary = "Create workspace")
    public ResponseEntity<WorkspaceResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody WorkspaceCreateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(orgId, request));
    }

    @GetMapping
    @Operation(summary = "List workspaces for organization")
    public ResponseEntity<List<WorkspaceResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String name) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(service.findByOrgId(orgId, status, name));
    }

    @GetMapping("/{workspaceId}")
    @Operation(summary = "Get workspace by ID")
    public ResponseEntity<WorkspaceResponse> getById(@PathVariable UUID orgId, @PathVariable UUID workspaceId) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(service.findById(workspaceId));
    }

    @PatchMapping("/{workspaceId}")
    @Operation(summary = "Update workspace")
    public ResponseEntity<WorkspaceResponse> update(
            @PathVariable UUID orgId,
            @PathVariable UUID workspaceId,
            @Valid @RequestBody WorkspaceUpdateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.ok(service.update(orgId, workspaceId, request));
    }

    @PostMapping("/{workspaceId}/archive")
    @Operation(summary = "Archive workspace")
    public ResponseEntity<WorkspaceResponse> archive(@PathVariable UUID orgId, @PathVariable UUID workspaceId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        return ResponseEntity.ok(service.archive(orgId, workspaceId));
    }

    @PostMapping("/{workspaceId}/restore")
    @Operation(summary = "Restore archived workspace")
    public ResponseEntity<WorkspaceResponse> restore(@PathVariable UUID orgId, @PathVariable UUID workspaceId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        return ResponseEntity.ok(service.restore(orgId, workspaceId));
    }
}
