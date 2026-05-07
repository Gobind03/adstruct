package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetResponse;
import com.avyukt.marketsuite.creative.api.dto.FolderCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.FolderResponse;
import com.avyukt.marketsuite.creative.service.CreativeFolderService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/folders")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeFoldersController {

    private final CreativeFolderService creativeFolderService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeFoldersController(
            CreativeFolderService creativeFolderService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeFolderService = creativeFolderService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List creative folders")
    public ResponseEntity<List<FolderResponse>> listFolders(@PathVariable UUID workspaceId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeFolderService.list(workspaceId));
    }

    @PostMapping
    @Operation(summary = "Create creative folder")
    public ResponseEntity<FolderResponse> createFolder(
            @PathVariable UUID workspaceId, @Valid @RequestBody FolderCreateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeFolderService.create(workspaceId, request));
    }

    @PatchMapping("/{folderId}")
    @Operation(summary = "Update folder name")
    public ResponseEntity<FolderResponse> updateFolder(
            @PathVariable UUID workspaceId,
            @PathVariable UUID folderId,
            @RequestParam(required = false) String name,
            @RequestBody(required = false) FolderNameBody body) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        String resolved = name != null && !name.isBlank() ? name : (body != null ? body.name() : null);
        if (resolved == null || resolved.isBlank()) {
            throw new BusinessException("name is required (query param or JSON body)");
        }
        return ResponseEntity.ok(creativeFolderService.update(workspaceId, folderId, resolved));
    }

    @DeleteMapping("/{folderId}")
    @Operation(summary = "Delete creative folder")
    public ResponseEntity<Void> deleteFolder(
            @PathVariable UUID workspaceId, @PathVariable UUID folderId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        creativeFolderService.delete(workspaceId, folderId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{folderId}/assets")
    @Operation(summary = "List assets in folder")
    public ResponseEntity<List<CreativeAssetResponse>> listFolderAssets(
            @PathVariable UUID workspaceId, @PathVariable UUID folderId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeFolderService.listAssetsInFolder(workspaceId, folderId));
    }

    @PostMapping("/{folderId}/assets/{assetId}")
    @Operation(summary = "Add asset to folder")
    public ResponseEntity<Void> addAssetToFolder(
            @PathVariable UUID workspaceId,
            @PathVariable UUID folderId,
            @PathVariable UUID assetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        creativeFolderService.addAsset(workspaceId, folderId, assetId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{folderId}/assets/{assetId}")
    @Operation(summary = "Remove asset from folder")
    public ResponseEntity<Void> removeAssetFromFolder(
            @PathVariable UUID workspaceId,
            @PathVariable UUID folderId,
            @PathVariable UUID assetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        creativeFolderService.removeAsset(workspaceId, folderId, assetId);
        return ResponseEntity.noContent().build();
    }

    private record FolderNameBody(String name) {}
}
