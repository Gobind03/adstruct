package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.*;
import com.avyukt.marketsuite.governance.domain.TemplateStatus;
import com.avyukt.marketsuite.governance.domain.TemplateType;
import com.avyukt.marketsuite.governance.service.TemplateService;
import com.avyukt.marketsuite.governance.service.TemplateUsageService;
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
@RequestMapping("/api/v1/orgs/{orgId}/templates")
@Tag(name = "Templates")
@SecurityRequirement(name = "bearerAuth")
public class TemplatesController {

    private final TemplateService service;
    private final TemplateUsageService usageService;

    public TemplatesController(TemplateService service, TemplateUsageService usageService) {
        this.service = service;
        this.usageService = usageService;
    }

    @GetMapping
    @Operation(summary = "List templates")
    public ResponseEntity<List<TemplateResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status) {
        TemplateType tt = type != null ? TemplateType.valueOf(type) : null;
        TemplateStatus ts = status != null ? TemplateStatus.valueOf(status) : null;
        return ResponseEntity.ok(service.list(orgId, workspaceId, tt, ts));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Create draft template")
    public ResponseEntity<TemplateResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody TemplateCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(orgId, request));
    }

    @GetMapping("/{templateId}")
    @Operation(summary = "Get template")
    public ResponseEntity<TemplateResponse> get(@PathVariable UUID orgId, @PathVariable UUID templateId) {
        return ResponseEntity.ok(service.get(templateId));
    }

    @PatchMapping("/{templateId}")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Patch draft template")
    public ResponseEntity<TemplateResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID templateId,
            @Valid @RequestBody TemplatePatchRequest request) {
        return ResponseEntity.ok(service.patch(orgId, templateId, request));
    }

    @PostMapping("/{templateId}/submit")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Submit template for review")
    public ResponseEntity<TemplateResponse> submit(@PathVariable UUID orgId, @PathVariable UUID templateId) {
        return ResponseEntity.ok(service.submitForReview(orgId, templateId));
    }

    @PostMapping("/{templateId}/approve")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'APPROVER')")
    @Operation(summary = "Approve template")
    public ResponseEntity<TemplateResponse> approve(
            @PathVariable UUID orgId,
            @PathVariable UUID templateId,
            @RequestBody(required = false) String notes) {
        return ResponseEntity.ok(service.handleApprovalResult(templateId, true, notes));
    }

    @PostMapping("/{templateId}/reject")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'APPROVER')")
    @Operation(summary = "Reject template")
    public ResponseEntity<TemplateResponse> reject(
            @PathVariable UUID orgId,
            @PathVariable UUID templateId,
            @RequestBody(required = false) String notes) {
        return ResponseEntity.ok(service.handleApprovalResult(templateId, false, notes));
    }

    @PostMapping("/{templateId}/new-version")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Create new version from approved template")
    public ResponseEntity<TemplateResponse> newVersion(@PathVariable UUID orgId, @PathVariable UUID templateId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createNewVersion(orgId, templateId));
    }

    @PostMapping("/{templateId}/archive")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Archive template")
    public ResponseEntity<TemplateResponse> archive(@PathVariable UUID orgId, @PathVariable UUID templateId) {
        return ResponseEntity.ok(service.archive(orgId, templateId));
    }

    @PostMapping("/{templateId}/record-usage")
    @Operation(summary = "Record template usage")
    public ResponseEntity<TemplateUsageResponse> recordUsage(
            @PathVariable UUID orgId,
            @PathVariable UUID templateId,
            @Valid @RequestBody TemplateUsageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usageService.recordUsage(templateId, request));
    }
}
