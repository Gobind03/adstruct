package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.domain.SyncMode;
import com.avyukt.marketsuite.integration.domain.SyncStatus;
import com.avyukt.marketsuite.integration.service.SyncJobService;
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
@RequestMapping("/api/v1/orgs/{orgId}/integrations/sync-jobs")
@Tag(name = "Sync Jobs")
@SecurityRequirement(name = "bearerAuth")
public class SyncJobsController {

    private final SyncJobService service;

    public SyncJobsController(SyncJobService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List sync jobs")
    public ResponseEntity<List<SyncJobResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) SyncStatus status) {
        return ResponseEntity.ok(service.listJobs(orgId, accountId, workspaceId, status).stream()
                .map(IntegrationMapper::toSyncJobResponse)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Create a sync job")
    public ResponseEntity<SyncJobResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody SyncJobCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(IntegrationMapper.toSyncJobResponse(service.createJob(
                        orgId,
                        request.accountId(),
                        request.workspaceId(),
                        request.resourceId(),
                        SyncMode.valueOf(request.mode()))));
    }

    @PostMapping("/{jobId}/run")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Run a sync job")
    public ResponseEntity<SyncJobResponse> run(@PathVariable UUID orgId, @PathVariable UUID jobId) {
        return ResponseEntity.ok(IntegrationMapper.toSyncJobResponse(service.runJob(orgId, jobId)));
    }
}
