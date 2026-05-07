package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.AuditLogResponse;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{orgId}/audit")
@Tag(name = "Audit Logs")
@SecurityRequirement(name = "bearerAuth")
public class AuditController {

    private final AuditService auditService;
    private final PermissionService permissionService;

    public AuditController(AuditService auditService, PermissionService permissionService) {
        this.auditService = auditService;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List audit logs with filters")
    public ResponseEntity<Page<AuditLogResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) UUID actorUserId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) OffsetDateTime dateFrom,
            @RequestParam(required = false) OffsetDateTime dateTo,
            Pageable pageable) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(
                auditService.findFiltered(orgId, workspaceId, actorUserId, entityType, action, dateFrom, dateTo, pageable));
    }
}
