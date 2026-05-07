package com.avyukt.marketsuite.creative.api;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.*;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeAiRunLink;
import com.avyukt.marketsuite.creative.repo.CreativeAiRunLinkRepository;
import com.avyukt.marketsuite.creative.service.ai.CreativeAiService;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/creative/ai")
@Tag(name = "Creative Studio")
@SecurityRequirement(name = "bearerAuth")
public class CreativeAiController {

    private final CreativeAiService creativeAiService;
    private final CreativeAiRunLinkRepository creativeAiRunLinkRepository;
    private final CreativeMapper creativeMapper;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public CreativeAiController(
            CreativeAiService creativeAiService,
            CreativeAiRunLinkRepository creativeAiRunLinkRepository,
            CreativeMapper creativeMapper,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.creativeAiService = creativeAiService;
        this.creativeAiRunLinkRepository = creativeAiRunLinkRepository;
        this.creativeMapper = creativeMapper;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @PostMapping("/copy/generate")
    @Operation(summary = "Generate copy variants with AI")
    public ResponseEntity<GenerateCopyResponse> generateCopy(
            @PathVariable UUID workspaceId, @Valid @RequestBody GenerateCopyRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeAiService.generateCopyVariants(workspaceId, request));
    }

    @PostMapping("/copy/hooks-angles-ctas")
    @Operation(summary = "Generate hooks, angles, and CTAs with AI")
    public ResponseEntity<GenerateHooksResponse> generateHooks(
            @PathVariable UUID workspaceId, @Valid @RequestBody GenerateHooksRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeAiService.generateHooksAnglesCtas(workspaceId, request));
    }

    @PostMapping("/copy/video-script")
    @Operation(summary = "Generate video script with AI")
    public ResponseEntity<GenerateVideoScriptResponse> generateVideoScript(
            @PathVariable UUID workspaceId, @Valid @RequestBody GenerateVideoScriptRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeAiService.generateVideoScript(workspaceId, request));
    }

    @PostMapping("/copy/ugc-brief")
    @Operation(summary = "Generate UGC brief with AI")
    public ResponseEntity<GenerateUgcBriefResponse> generateUgcBrief(
            @PathVariable UUID workspaceId, @Valid @RequestBody GenerateUgcBriefRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(creativeAiService.generateUgcBrief(workspaceId, request));
    }

    @PostMapping("/assets/{assetId}/enrich")
    @Operation(summary = "Enrich asset metadata with AI")
    public ResponseEntity<EnrichAssetResponse> enrichAsset(
            @PathVariable UUID workspaceId,
            @PathVariable UUID assetId,
            @Valid @RequestBody EnrichAssetRequest request) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeAiUse(orgId, workspaceId);
        return ResponseEntity.ok(creativeAiService.enrichAssetMetadata(workspaceId, assetId, request));
    }

    @GetMapping("/links")
    @Operation(summary = "List creative AI run links")
    public ResponseEntity<List<CreativeAiRunLinkResponse>> listAiRunLinks(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String producedEntityType,
            @RequestParam(required = false) UUID producedEntityId) {
        var workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = workspace.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        List<CreativeAiRunLink> links;
        if (producedEntityType != null
                && !producedEntityType.isBlank()
                && producedEntityId != null) {
            links =
                    creativeAiRunLinkRepository
                            .findByProducedEntityTypeAndProducedEntityId(producedEntityType, producedEntityId)
                            .stream()
                            .filter(l -> l.getWorkspace().getId().equals(workspaceId))
                            .toList();
        } else {
            links = creativeAiRunLinkRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        }

        return ResponseEntity.ok(
                links.stream().map(creativeMapper::toAiRunLinkResponse).toList());
    }
}
