package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.VariantCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.VariantResponse;
import com.avyukt.marketsuite.creative.api.dto.VariantSetCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.VariantSetResponse;
import com.avyukt.marketsuite.creative.service.CreativeVariantService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/variant-sets")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeVariantsController {

    private final CreativeVariantService creativeVariantService;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeVariantsController(
            CreativeVariantService creativeVariantService,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeVariantService = creativeVariantService;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @PostMapping
    @Operation(summary = "Create variant set")
    public ResponseEntity<VariantSetResponse> createVariantSet(
            @PathVariable UUID workspaceId, @Valid @RequestBody VariantSetCreateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeVariantService.createSet(workspaceId, request));
    }

    @GetMapping
    @Operation(summary = "List variant sets")
    public ResponseEntity<List<VariantSetResponse>> listVariantSets(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String parentEntityType,
            @RequestParam(required = false) UUID parentEntityId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(
                creativeVariantService.listSets(workspaceId, parentEntityType, parentEntityId));
    }

    @GetMapping("/{variantSetId}")
    @Operation(summary = "Get variant set")
    public ResponseEntity<VariantSetResponse> getVariantSet(
            @PathVariable UUID workspaceId, @PathVariable UUID variantSetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeVariantService.getSet(workspaceId, variantSetId));
    }

    @PostMapping("/{variantSetId}/variants")
    @Operation(summary = "Add variant to set")
    public ResponseEntity<VariantResponse> addVariant(
            @PathVariable UUID workspaceId,
            @PathVariable UUID variantSetId,
            @Valid @RequestBody VariantCreateRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeVariantService.addVariant(workspaceId, variantSetId, request));
    }

    @GetMapping("/{variantSetId}/variants")
    @Operation(summary = "List variants in set")
    public ResponseEntity<List<VariantResponse>> listVariants(
            @PathVariable UUID workspaceId, @PathVariable UUID variantSetId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return ResponseEntity.ok(creativeVariantService.listVariants(variantSetId));
    }
}
