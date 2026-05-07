package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.IntegrationResourceResponse;
import com.avyukt.marketsuite.integration.api.dto.ResourceUpdateRequest;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.service.ResourceDiscoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Integration Resources")
@SecurityRequirement(name = "bearerAuth")
public class IntegrationResourcesController {

    private final ResourceDiscoveryService discoveryService;

    public IntegrationResourcesController(ResourceDiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/resources")
    @Operation(summary = "List resources for an integration account")
    public ResponseEntity<List<IntegrationResourceResponse>> listResources(
            @PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(discoveryService.listResources(accountId).stream()
                .map(IntegrationMapper::toResourceResponse)
                .toList());
    }

    @PostMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/discover")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Discover resources for an integration account")
    public ResponseEntity<List<IntegrationResourceResponse>> discover(
            @PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(discoveryService.discover(orgId, accountId).stream()
                .map(IntegrationMapper::toResourceResponse)
                .toList());
    }

    @PatchMapping("/api/v1/orgs/{orgId}/integrations/resources/{resourceId}")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Update resource (enable/disable)")
    public ResponseEntity<IntegrationResourceResponse> updateResource(
            @PathVariable UUID orgId, @PathVariable UUID resourceId, @RequestBody ResourceUpdateRequest request) {
        return ResponseEntity.ok(IntegrationMapper.toResourceResponse(
                discoveryService.updateResource(orgId, resourceId, request.enabled(), request.displayName())));
    }
}
