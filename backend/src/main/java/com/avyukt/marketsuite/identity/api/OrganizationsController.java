package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.OrganizationCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.OrganizationResponse;
import com.avyukt.marketsuite.identity.api.dto.OrganizationUpdateRequest;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.OrganizationService;
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
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organizations")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationsController {

    private final OrganizationService service;
    private final PermissionService permissionService;

    public OrganizationsController(OrganizationService service, PermissionService permissionService) {
        this.service = service;
        this.permissionService = permissionService;
    }

    @PostMapping
    @Operation(summary = "Create organization")
    public ResponseEntity<OrganizationResponse> create(@Valid @RequestBody OrganizationCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping
    @Operation(summary = "List organizations accessible to current user")
    public ResponseEntity<List<OrganizationResponse>> list() {
        return ResponseEntity.ok(service.findAllForCurrentUser());
    }

    @GetMapping("/{orgId}")
    @Operation(summary = "Get organization by ID")
    public ResponseEntity<OrganizationResponse> getById(@PathVariable UUID orgId) {
        permissionService.requireOrgAccess(orgId);
        return ResponseEntity.ok(service.findById(orgId));
    }

    @PatchMapping("/{orgId}")
    @Operation(summary = "Update organization")
    public ResponseEntity<OrganizationResponse> update(
            @PathVariable UUID orgId, @Valid @RequestBody OrganizationUpdateRequest request) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        return ResponseEntity.ok(service.update(orgId, request));
    }
}
