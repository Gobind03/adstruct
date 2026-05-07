package com.avyukt.marketsuite.governance.api;

import com.avyukt.marketsuite.governance.api.dto.EffectiveBrandProfileResponse;
import com.avyukt.marketsuite.governance.api.dto.OrgBrandProfilePatchRequest;
import com.avyukt.marketsuite.governance.api.dto.OrgBrandProfileResponse;
import com.avyukt.marketsuite.governance.api.dto.WorkspaceBrandOverridesRequest;
import com.avyukt.marketsuite.governance.service.OrgBrandProfileService;
import com.avyukt.marketsuite.governance.service.WorkspaceBrandProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Brand Profiles")
@SecurityRequirement(name = "bearerAuth")
public class BrandProfilesController {

    private final OrgBrandProfileService orgService;
    private final WorkspaceBrandProfileService wsService;

    public BrandProfilesController(OrgBrandProfileService orgService, WorkspaceBrandProfileService wsService) {
        this.orgService = orgService;
        this.wsService = wsService;
    }

    @GetMapping("/api/v1/orgs/{orgId}/brand-profile")
    @Operation(summary = "Get org brand profile")
    public ResponseEntity<OrgBrandProfileResponse> getOrgProfile(@PathVariable UUID orgId) {
        return ResponseEntity.ok(orgService.get(orgId));
    }

    @PostMapping("/api/v1/orgs/{orgId}/brand-profile")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Create default org brand profile")
    public ResponseEntity<OrgBrandProfileResponse> createOrgProfile(@PathVariable UUID orgId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orgService.createDefault(orgId));
    }

    @PatchMapping("/api/v1/orgs/{orgId}/brand-profile")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Patch org brand profile")
    public ResponseEntity<OrgBrandProfileResponse> patchOrgProfile(
            @PathVariable UUID orgId, @Valid @RequestBody OrgBrandProfilePatchRequest request) {
        return ResponseEntity.ok(orgService.patch(orgId, request));
    }

    @GetMapping("/api/v1/workspaces/{workspaceId}/brand-profile/effective")
    @Operation(summary = "Get effective brand profile for workspace")
    public ResponseEntity<EffectiveBrandProfileResponse> getEffective(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(wsService.getEffectiveProfile(workspaceId));
    }

    @PatchMapping("/api/v1/workspaces/{workspaceId}/brand-profile/overrides")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Patch workspace brand overrides")
    public ResponseEntity<EffectiveBrandProfileResponse> patchOverrides(
            @PathVariable UUID workspaceId, @Valid @RequestBody WorkspaceBrandOverridesRequest request) {
        return ResponseEntity.ok(wsService.patchOverrides(workspaceId, request.overridesJson()));
    }

    @PostMapping("/api/v1/workspaces/{workspaceId}/brand-profile/init")
    @PreAuthorize("hasAnyRole('ORG_ADMIN', 'WORKSPACE_ADMIN')")
    @Operation(summary = "Initialize workspace brand profile from org")
    public ResponseEntity<EffectiveBrandProfileResponse> initWorkspaceProfile(@PathVariable UUID workspaceId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(wsService.initFromOrg(workspaceId));
    }
}
