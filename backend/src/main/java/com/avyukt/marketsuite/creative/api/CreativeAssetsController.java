package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetResponse;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetUpdateRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetVersionRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetVersionResponse;
import com.avyukt.marketsuite.creative.service.CreativeAssetService;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/assets")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeAssetsController {

    private final CreativeAssetService creativeAssetService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeAssetsController(
            CreativeAssetService creativeAssetService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeAssetService = creativeAssetService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List creative assets")
    public ResponseEntity<PagedResponse<CreativeAssetResponse>> listAssets(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20) Pageable pageable) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeAssetService.list(workspaceId, type, status, q, pageable));
    }

    @PostMapping
    @Operation(summary = "Create creative asset")
    public ResponseEntity<CreativeAssetResponse> createAsset(
            @PathVariable UUID workspaceId, @Valid @RequestBody CreativeAssetCreateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeAssetService.create(workspaceId, request));
    }

    @GetMapping("/{assetId}")
    @Operation(summary = "Get creative asset")
    public ResponseEntity<CreativeAssetResponse> getAsset(
            @PathVariable UUID workspaceId, @PathVariable UUID assetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeAssetService.get(workspaceId, assetId));
    }

    @PatchMapping("/{assetId}")
    @Operation(summary = "Update creative asset")
    public ResponseEntity<CreativeAssetResponse> updateAsset(
            @PathVariable UUID workspaceId,
            @PathVariable UUID assetId,
            @Valid @RequestBody CreativeAssetUpdateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.ok(creativeAssetService.update(workspaceId, assetId, request));
    }

    @PostMapping("/{assetId}/archive")
    @Operation(summary = "Archive creative asset")
    public ResponseEntity<CreativeAssetResponse> archiveAsset(
            @PathVariable UUID workspaceId, @PathVariable UUID assetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.ok(creativeAssetService.archive(workspaceId, assetId));
    }

    @GetMapping("/{assetId}/versions")
    @Operation(summary = "List asset versions")
    public ResponseEntity<List<CreativeAssetVersionResponse>> listVersions(
            @PathVariable UUID workspaceId, @PathVariable UUID assetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeAssetService.listVersions(workspaceId, assetId));
    }

    @PostMapping("/{assetId}/versions")
    @Operation(summary = "Add asset version")
    public ResponseEntity<CreativeAssetVersionResponse> addVersion(
            @PathVariable UUID workspaceId,
            @PathVariable UUID assetId,
            @Valid @RequestBody CreativeAssetVersionRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeAssetService.addVersion(workspaceId, assetId, request));
    }
}
