package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.*;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.identity.service.TeamService;
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
@RequestMapping("/api/v1/organizations/{orgId}/teams")
@Tag(name = "Teams")
@SecurityRequirement(name = "bearerAuth")
public class TeamsController {

    private final TeamService teamService;
    private final PermissionService permissionService;

    public TeamsController(TeamService teamService, PermissionService permissionService) {
        this.teamService = teamService;
        this.permissionService = permissionService;
    }

    @GetMapping
    @Operation(summary = "List teams")
    public ResponseEntity<List<TeamResponse>> list(
            @PathVariable UUID orgId, @RequestParam(required = false) UUID workspaceId) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(teamService.listTeams(orgId, workspaceId));
    }

    @PostMapping
    @Operation(summary = "Create team")
    public ResponseEntity<TeamResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody TeamCreateRequest request) {
        permissionService.requireOrgRole(
                orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED).body(teamService.createTeam(orgId, request));
    }

    @GetMapping("/{teamId}")
    @Operation(summary = "Get team details")
    public ResponseEntity<TeamResponse> getById(@PathVariable UUID orgId, @PathVariable UUID teamId) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(teamService.getTeam(teamId));
    }

    @PatchMapping("/{teamId}")
    @Operation(summary = "Update team")
    public ResponseEntity<TeamResponse> update(
            @PathVariable UUID orgId, @PathVariable UUID teamId, @Valid @RequestBody TeamUpdateRequest request) {
        permissionService.requireOrgRole(
                orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
        return ResponseEntity.ok(teamService.updateTeam(orgId, teamId, request));
    }

    @DeleteMapping("/{teamId}")
    @Operation(summary = "Delete team")
    public ResponseEntity<Void> delete(@PathVariable UUID orgId, @PathVariable UUID teamId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
        teamService.deleteTeam(orgId, teamId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{teamId}/members")
    @Operation(summary = "Add member to team")
    public ResponseEntity<TeamMemberResponse> addMember(
            @PathVariable UUID orgId, @PathVariable UUID teamId, @Valid @RequestBody TeamMemberRequest request) {
        permissionService.requireOrgRole(
                orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(teamService.addMember(orgId, teamId, request.userId()));
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    @Operation(summary = "Remove member from team")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID orgId, @PathVariable UUID teamId, @PathVariable UUID userId) {
        permissionService.requireOrgRole(
                orgId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
        teamService.removeMember(orgId, teamId, userId);
        return ResponseEntity.noContent().build();
    }
}
