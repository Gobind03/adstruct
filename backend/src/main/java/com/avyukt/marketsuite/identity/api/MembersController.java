package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.MemberCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.MemberDetailResponse;
import com.avyukt.marketsuite.identity.api.dto.MemberUpdateRequest;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.UserStatus;
import com.avyukt.marketsuite.identity.service.MembershipService;
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
@RequestMapping("/api/v1/organizations/{orgId}/members")
@Tag(name = "Members")
@SecurityRequirement(name = "bearerAuth")
public class MembersController {

    private final MembershipService membershipService;
    private final PermissionService permissionService;

    public MembersController(MembershipService membershipService, PermissionService permissionService) {
        this.membershipService = membershipService;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List members of an organization")
    public ResponseEntity<List<MemberDetailResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) UUID workspaceId,
            @RequestParam(required = false) MemberRole role,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String query) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(membershipService.listMembers(orgId, workspaceId, role, status, query));
    }

    @PostMapping
    @Operation(summary = "Create membership (add member)")
    public ResponseEntity<MemberDetailResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody MemberCreateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(membershipService.createMembership(orgId, request));
    }

    @PatchMapping("/{membershipId}")
    @Operation(summary = "Update member role")
    public ResponseEntity<MemberDetailResponse> updateRole(
            @PathVariable UUID orgId,
            @PathVariable UUID membershipId,
            @Valid @RequestBody MemberUpdateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        return ResponseEntity.ok(membershipService.updateRole(orgId, membershipId, request));
    }

    @DeleteMapping("/{membershipId}")
    @Operation(summary = "Remove member")
    public ResponseEntity<Void> delete(@PathVariable UUID orgId, @PathVariable UUID membershipId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        membershipService.deleteMembership(orgId, membershipId);
        return ResponseEntity.noContent().build();
    }
}
