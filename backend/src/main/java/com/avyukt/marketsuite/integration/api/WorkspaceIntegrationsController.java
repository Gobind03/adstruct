package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.service.WorkspaceIntegrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/integrations")
@Tag(name = "Workspace Integrations")
@SecurityRequirement(name = "bearerAuth")
public class WorkspaceIntegrationsController {

    private final WorkspaceIntegrationService service;

    public WorkspaceIntegrationsController(WorkspaceIntegrationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List workspace integrations")
    public ResponseEntity<List<WorkspaceIntegrationResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(service.listByWorkspace(workspaceId).stream()
                .map(IntegrationMapper::toWorkspaceIntegrationResponse)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Map an integration to a workspace")
    public ResponseEntity<WorkspaceIntegrationResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody WorkspaceIntegrationCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(IntegrationMapper.toWorkspaceIntegrationResponse(service.mapToWorkspace(
                        workspaceId,
                        request.accountId(),
                        request.resourceId(),
                        request.enabled(),
                        request.isDefault(),
                        request.settingsJson())));
    }

    @PatchMapping("/{wsIntegrationId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Update workspace integration")
    public ResponseEntity<WorkspaceIntegrationResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID wsIntegrationId,
            @RequestBody WorkspaceIntegrationUpdateRequest request) {
        return ResponseEntity.ok(IntegrationMapper.toWorkspaceIntegrationResponse(
                service.update(workspaceId, wsIntegrationId, request.enabled(), request.settingsJson())));
    }

    @PostMapping("/{wsIntegrationId}/set-default")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Set as default integration for workspace")
    public ResponseEntity<WorkspaceIntegrationResponse> setDefault(
            @PathVariable UUID workspaceId, @PathVariable UUID wsIntegrationId) {
        return ResponseEntity.ok(
                IntegrationMapper.toWorkspaceIntegrationResponse(service.setDefault(workspaceId, wsIntegrationId)));
    }

    @DeleteMapping("/{wsIntegrationId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Remove workspace integration mapping")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID wsIntegrationId) {
        service.unmap(workspaceId, wsIntegrationId);
        return ResponseEntity.noContent().build();
    }
}
