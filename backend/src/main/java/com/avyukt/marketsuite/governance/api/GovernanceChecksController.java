package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRequest;
import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRunResponse;
import com.avyukt.marketsuite.governance.service.GovernanceCheckService;
import com.avyukt.marketsuite.integration.domain.PlatformType;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/governance")
@Tag(name = "Governance Checks")
@SecurityRequirement(name = "bearerAuth")
public class GovernanceChecksController {

    private final GovernanceCheckService service;

    public GovernanceChecksController(GovernanceCheckService service) {
        this.service = service;
    }

    @PostMapping("/check")
    @Operation(summary = "Run governance check")
    public ResponseEntity<GovernanceCheckRunResponse> runCheck(
            @PathVariable UUID workspaceId, @Valid @RequestBody GovernanceCheckRequest request) {
        UUID ruleSetId = request.ruleSetId() != null ? UUID.fromString(request.ruleSetId()) : null;
        PlatformType pt = request.platformType() != null ? PlatformType.valueOf(request.platformType()) : null;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.runChecks(
                        workspaceId,
                        request.entityType(),
                        request.entityId(),
                        request.contentPayloadJson(),
                        ruleSetId,
                        pt,
                        request.language()));
    }

    @GetMapping("/checks")
    @Operation(summary = "List governance check runs for the workspace, or filter by entity when both params are set")
    public ResponseEntity<List<GovernanceCheckRunResponse>> listChecks(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId) {
        if (entityType != null && entityId != null) {
            return ResponseEntity.ok(service.listByEntity(workspaceId, entityType, entityId));
        }
        if (entityType == null && entityId == null) {
            return ResponseEntity.ok(service.listForWorkspace(workspaceId));
        }
        return ResponseEntity.badRequest().build();
    }

    @GetMapping("/checks/{checkRunId}")
    @Operation(summary = "Get governance check run")
    public ResponseEntity<GovernanceCheckRunResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID checkRunId) {
        return ResponseEntity.ok(service.get(checkRunId));
    }
}
