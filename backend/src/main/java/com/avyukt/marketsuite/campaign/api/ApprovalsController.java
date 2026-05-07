package com.avyukt.marketsuite.campaign.api;

import com.avyukt.marketsuite.campaign.api.dto.ApprovalActionRequest;
import com.avyukt.marketsuite.campaign.api.dto.ApprovalResponse;
import com.avyukt.marketsuite.campaign.api.dto.ApprovalSubmitRequest;
import com.avyukt.marketsuite.campaign.service.ApprovalService;
import com.avyukt.marketsuite.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/approvals")
@Tag(name = "Approvals")
@SecurityRequirement(name = "bearerAuth")
public class ApprovalsController {

    private final ApprovalService service;

    public ApprovalsController(ApprovalService service) {
        this.service = service;
    }

    @PostMapping("/submit")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'EDITOR')")
    @Operation(summary = "Submit entity for approval")
    public ResponseEntity<ApprovalResponse> submit(@Valid @RequestBody ApprovalSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.submit(request.entityType(), request.entityId()));
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'APPROVER')")
    @Operation(summary = "List pending approvals")
    public ResponseEntity<List<ApprovalResponse>> pending() {
        return ResponseEntity.ok(service.findPending());
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'APPROVER')")
    @Operation(summary = "Approve entity")
    public ResponseEntity<ApprovalResponse> approve(@PathVariable UUID id,
                                                     @RequestBody(required = false) ApprovalActionRequest request,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        String notes = request != null ? request.notes() : null;
        return ResponseEntity.ok(service.approve(id, principal.getId(), notes));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN', 'APPROVER')")
    @Operation(summary = "Reject entity")
    public ResponseEntity<ApprovalResponse> reject(@PathVariable UUID id,
                                                    @RequestBody(required = false) ApprovalActionRequest request,
                                                    @AuthenticationPrincipal UserPrincipal principal) {
        String notes = request != null ? request.notes() : null;
        return ResponseEntity.ok(service.reject(id, principal.getId(), notes));
    }
}
