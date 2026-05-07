package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.InviteAcceptRequest;
import com.avyukt.marketsuite.identity.api.dto.InviteCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.InviteResponse;
import com.avyukt.marketsuite.identity.domain.InviteStatus;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.InviteService;
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
@Tag(name = "Invites")
public class InvitesController {

    private final InviteService inviteService;
    private final PermissionService permissionService;

    public InvitesController(InviteService inviteService, PermissionService permissionService) {
        this.inviteService = inviteService;
        this.permissionService = permissionService;
    }

    @PostMapping("/api/v1/organizations/{orgId}/invites")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Create invite")
    public ResponseEntity<InviteResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody InviteCreateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(inviteService.createInvite(orgId, request));
    }

    @GetMapping("/api/v1/organizations/{orgId}/invites")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List invites")
    public ResponseEntity<List<InviteResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) InviteStatus status,
            @RequestParam(required = false) UUID workspaceId) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(inviteService.listInvites(orgId, status, workspaceId));
    }

    @PostMapping("/api/v1/invites/accept")
    @Operation(summary = "Accept invite (public)")
    public ResponseEntity<Void> accept(@Valid @RequestBody InviteAcceptRequest request) {
        inviteService.acceptInvite(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/v1/organizations/{orgId}/invites/{inviteId}/revoke")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Revoke invite")
    public ResponseEntity<InviteResponse> revoke(@PathVariable UUID orgId, @PathVariable UUID inviteId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.ok(inviteService.revokeInvite(orgId, inviteId));
    }

    @PostMapping("/api/v1/organizations/{orgId}/invites/{inviteId}/resend")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Resend invite")
    public ResponseEntity<InviteResponse> resend(@PathVariable UUID orgId, @PathVariable UUID inviteId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.ok(inviteService.resendInvite(orgId, inviteId));
    }
}
