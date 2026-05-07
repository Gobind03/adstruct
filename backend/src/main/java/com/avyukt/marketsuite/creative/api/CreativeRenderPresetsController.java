package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.RenderPresetCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.RenderPresetResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeRenderPreset;
import com.avyukt.marketsuite.creative.domain.RenderPreset;
import com.avyukt.marketsuite.creative.repo.CreativeRenderPresetRepository;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/render-presets")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeRenderPresetsController {

    private final CreativeRenderPresetRepository creativeRenderPresetRepository;
    private final CreativeMapper creativeMapper;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeRenderPresetsController(
            CreativeRenderPresetRepository creativeRenderPresetRepository,
            CreativeMapper creativeMapper,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeRenderPresetRepository = creativeRenderPresetRepository;
        this.creativeMapper = creativeMapper;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List render presets")
    public ResponseEntity<List<RenderPresetResponse>> listPresets(@PathVariable UUID workspaceId) {
        Workspace workspace = requireWorkspace(workspaceId);
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        List<RenderPresetResponse> items =
                creativeRenderPresetRepository.findByWorkspaceIdOrderByPresetAsc(workspaceId).stream()
                        .map(creativeMapper::toPresetResponse)
                        .toList();
        return ResponseEntity.ok(items);
    }

    @PostMapping
    @Operation(summary = "Create render preset")
    public ResponseEntity<RenderPresetResponse> createPreset(
            @PathVariable UUID workspaceId, @Valid @RequestBody RenderPresetCreateRequest request) {
        Workspace workspace = requireWorkspace(workspaceId);
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        RenderPreset presetEnum;
        try {
            presetEnum = RenderPreset.valueOf(request.preset());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid preset: " + request.preset());
        }

        creativeRenderPresetRepository
                .findByWorkspaceIdAndPreset(workspaceId, presetEnum)
                .ifPresent(
                        existing -> {
                            throw new BusinessException(
                                    "Render preset already exists for workspace: " + request.preset());
                        });

        CreativeRenderPreset entity =
                CreativeRenderPreset.builder()
                        .workspace(workspace)
                        .preset(presetEnum)
                        .constraintsJson(
                                request.constraintsJson() != null && !request.constraintsJson().isBlank()
                                        ? request.constraintsJson()
                                        : "{}")
                        .build();
        CreativeRenderPreset saved = creativeRenderPresetRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(creativeMapper.toPresetResponse(saved));
    }

    @PatchMapping("/{presetId}")
    @Operation(summary = "Update render preset constraints")
    public ResponseEntity<RenderPresetResponse> updatePreset(
            @PathVariable UUID workspaceId,
            @PathVariable UUID presetId,
            @Valid @RequestBody RenderPresetConstraintsPatch request) {
        Workspace workspace = requireWorkspace(workspaceId);
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeRenderPreset entity =
                creativeRenderPresetRepository
                        .findById(presetId)
                        .orElseThrow(() -> new ResourceNotFoundException("CreativeRenderPreset", "id", presetId));
        if (!entity.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeRenderPreset", "id", presetId);
        }
        entity.setConstraintsJson(request.constraintsJson());
        CreativeRenderPreset saved = creativeRenderPresetRepository.save(entity);
        return ResponseEntity.ok(creativeMapper.toPresetResponse(saved));
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private record RenderPresetConstraintsPatch(@NotNull String constraintsJson) {}
}
