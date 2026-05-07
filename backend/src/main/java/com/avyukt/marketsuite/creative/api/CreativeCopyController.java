package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactResponse;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactUpdateRequest;
import com.avyukt.marketsuite.creative.service.CreativeCopyService;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/copy")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeCopyController {

    private final CreativeCopyService creativeCopyService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeCopyController(
            CreativeCopyService creativeCopyService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeCopyService = creativeCopyService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List copy artifacts")
    public ResponseEntity<PagedResponse<CopyArtifactResponse>> listCopies(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeCopyService.list(workspaceId, type, status, language, q, pageable));
    }

    @PostMapping
    @Operation(summary = "Create copy artifact")
    public ResponseEntity<CopyArtifactResponse> createCopy(
            @PathVariable UUID workspaceId, @Valid @RequestBody CopyArtifactCreateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeCopyService.create(workspaceId, request));
    }

    @GetMapping("/{copyId}")
    @Operation(summary = "Get copy artifact")
    public ResponseEntity<CopyArtifactResponse> getCopy(
            @PathVariable UUID workspaceId, @PathVariable UUID copyId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeCopyService.get(workspaceId, copyId));
    }

    @PatchMapping("/{copyId}")
    @Operation(summary = "Update copy artifact")
    public ResponseEntity<CopyArtifactResponse> updateCopy(
            @PathVariable UUID workspaceId,
            @PathVariable UUID copyId,
            @Valid @RequestBody CopyArtifactUpdateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.ok(creativeCopyService.update(workspaceId, copyId, request));
    }

    @PostMapping("/{copyId}/archive")
    @Operation(summary = "Archive copy artifact")
    public ResponseEntity<CopyArtifactResponse> archiveCopy(
            @PathVariable UUID workspaceId, @PathVariable UUID copyId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.ok(creativeCopyService.archive(workspaceId, copyId));
    }

    @PostMapping("/{copyId}/governance-check")
    @Operation(summary = "Run governance check on copy artifact")
    public ResponseEntity<CopyArtifactResponse> runGovernanceCheck(
            @PathVariable UUID workspaceId,
            @PathVariable UUID copyId,
            @Valid @RequestBody CopyGovernanceCheckRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.ok(
                creativeCopyService.runGovernanceCheck(
                        workspaceId, copyId, request.platformType(), request.language()));
    }

    private record CopyGovernanceCheckRequest(String platformType, String language) {}
}
