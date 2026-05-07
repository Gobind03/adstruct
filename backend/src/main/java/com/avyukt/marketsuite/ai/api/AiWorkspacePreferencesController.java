package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiWorkspacePreferenceCreateRequest;
import com.avyukt.marketsuite.ai.api.dto.AiWorkspacePreferencePatchRequest;
import com.avyukt.marketsuite.ai.api.dto.AiWorkspacePreferenceResponse;
import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import com.avyukt.marketsuite.ai.domain.AiWorkspaceProviderPreference;
import com.avyukt.marketsuite.ai.repo.AiProviderConfigRepository;
import com.avyukt.marketsuite.ai.repo.AiWorkspaceProviderPreferenceRepository;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/ai/provider-preferences")
@Tag(name = "AI Workspace Preferences")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiWorkspacePreferencesController {

    private final AiWorkspaceProviderPreferenceRepository preferenceRepository;
    private final AiProviderConfigRepository providerConfigRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public AiWorkspacePreferencesController(
            AiWorkspaceProviderPreferenceRepository preferenceRepository,
            AiProviderConfigRepository providerConfigRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.preferenceRepository = preferenceRepository;
        this.providerConfigRepository = providerConfigRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List AI provider preferences for workspace")
    public ResponseEntity<List<AiWorkspacePreferenceResponse>> list(@PathVariable UUID workspaceId) {
        Workspace ws = loadWorkspace(workspaceId);
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);
        List<AiWorkspacePreferenceResponse> out =
                preferenceRepository.findByWorkspaceId(workspaceId).stream()
                        .map(this::toPreferenceResponse)
                        .toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create AI provider preference for workspace")
    public ResponseEntity<AiWorkspacePreferenceResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody AiWorkspacePreferenceCreateRequest request) {
        Workspace ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);

        AiProviderConfig provider =
                providerConfigRepository
                        .findById(request.providerConfigId())
                        .orElseThrow(
                                () ->
                                        new ResourceNotFoundException(
                                                "AiProviderConfig", "id", request.providerConfigId()));
        if (!provider.getOrg().getId().equals(orgId)) {
            throw new BusinessException("Provider config does not belong to this workspace's organization");
        }

        AiWorkspaceProviderPreference pref =
                AiWorkspaceProviderPreference.builder()
                        .workspace(ws)
                        .providerConfig(provider)
                        .isDefault(request.isDefault() != null && request.isDefault())
                        .allowedModels(
                                request.allowedModels() != null && !request.allowedModels().isBlank()
                                        ? request.allowedModels()
                                        : "[]")
                        .policyJson(
                                request.policyJson() != null && !request.policyJson().isBlank()
                                        ? request.policyJson()
                                        : "{}")
                        .build();

        if (pref.isDefault()) {
            clearDefaultForWorkspace(workspaceId);
        }

        AiWorkspaceProviderPreference saved = preferenceRepository.save(pref);
        return ResponseEntity.status(HttpStatus.CREATED).body(toPreferenceResponse(saved));
    }

    @PatchMapping("/{prefId}")
    @Transactional
    @Operation(summary = "Update AI provider preference")
    public ResponseEntity<AiWorkspacePreferenceResponse> patch(
            @PathVariable UUID workspaceId,
            @PathVariable UUID prefId,
            @Valid @RequestBody AiWorkspacePreferencePatchRequest request) {
        Workspace ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);

        AiWorkspaceProviderPreference pref = loadPreference(workspaceId, prefId);

        if (request.isDefault() != null) {
            if (request.isDefault()) {
                clearDefaultForWorkspace(workspaceId);
            }
            pref.setDefault(request.isDefault());
        }
        if (request.allowedModels() != null) {
            pref.setAllowedModels(request.allowedModels());
        }
        if (request.policyJson() != null) {
            pref.setPolicyJson(request.policyJson());
        }

        return ResponseEntity.ok(toPreferenceResponse(preferenceRepository.save(pref)));
    }

    @PostMapping("/{prefId}/set-default")
    @Transactional
    @Operation(summary = "Set preference as default for workspace")
    public ResponseEntity<AiWorkspacePreferenceResponse> setDefault(
            @PathVariable UUID workspaceId, @PathVariable UUID prefId) {
        Workspace ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);

        AiWorkspaceProviderPreference pref = loadPreference(workspaceId, prefId);
        clearDefaultForWorkspace(workspaceId);
        pref.setDefault(true);
        return ResponseEntity.ok(toPreferenceResponse(preferenceRepository.save(pref)));
    }

    private Workspace loadWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private AiWorkspaceProviderPreference loadPreference(UUID workspaceId, UUID prefId) {
        AiWorkspaceProviderPreference pref =
                preferenceRepository
                        .findById(prefId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("AiWorkspaceProviderPreference", "id", prefId));
        if (!pref.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Preference does not belong to this workspace");
        }
        return pref;
    }

    private void clearDefaultForWorkspace(UUID workspaceId) {
        for (AiWorkspaceProviderPreference p : preferenceRepository.findByWorkspaceId(workspaceId)) {
            if (p.isDefault()) {
                p.setDefault(false);
                preferenceRepository.save(p);
            }
        }
    }

    private AiWorkspacePreferenceResponse toPreferenceResponse(AiWorkspaceProviderPreference p) {
        AiProviderConfig cfg = p.getProviderConfig();
        return new AiWorkspacePreferenceResponse(
                p.getId(),
                p.getWorkspace().getId(),
                cfg != null ? cfg.getId() : null,
                cfg != null && cfg.getProviderType() != null ? cfg.getProviderType().name() : null,
                cfg != null ? cfg.getDefaultModel() : null,
                p.isDefault(),
                p.getAllowedModels(),
                p.getPolicyJson(),
                p.getCreatedAt());
    }
}
