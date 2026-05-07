package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.service.EntityMappingService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/mappings")
@Tag(name = "Platform Entity Mappings")
@SecurityRequirement(name = "bearerAuth")
public class PlatformEntityMappingsController {

    private final EntityMappingService service;

    public PlatformEntityMappingsController(EntityMappingService service) {
        this.service = service;
    }

    @GetMapping("/internal")
    @Operation(summary = "Get mappings by internal entity")
    public ResponseEntity<List<PlatformEntityMappingResponse>> getByInternal(
            @PathVariable UUID workspaceId,
            @RequestParam String internalEntityType,
            @RequestParam UUID internalEntityId) {
        return ResponseEntity.ok(service.getMappingsByInternal(workspaceId, internalEntityType, internalEntityId).stream()
                .map(IntegrationMapper::toMappingResponse)
                .toList());
    }

    @GetMapping("/external")
    @Operation(summary = "Get mappings by external entity")
    public ResponseEntity<List<PlatformEntityMappingResponse>> getByExternal(
            @PathVariable UUID workspaceId,
            @RequestParam UUID accountId,
            @RequestParam String externalEntityType,
            @RequestParam String externalEntityId) {
        return ResponseEntity.ok(service.getMappingsByExternal(accountId, externalEntityType, externalEntityId).stream()
                .map(IntegrationMapper::toMappingResponse)
                .toList());
    }

    @PostMapping
    @Operation(summary = "Create a platform entity mapping")
    public ResponseEntity<PlatformEntityMappingResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody PlatformEntityMappingCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(IntegrationMapper.toMappingResponse(service.createMapping(
                        workspaceId,
                        request.accountId(),
                        request.resourceId(),
                        request.internalEntityType(),
                        request.internalEntityId(),
                        request.externalEntityType(),
                        request.externalEntityId(),
                        request.externalParentId(),
                        request.metaJson())));
    }

    @DeleteMapping("/{mappingId}")
    @Operation(summary = "Delete a platform entity mapping")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID mappingId) {
        service.deleteMapping(workspaceId, mappingId);
        return ResponseEntity.noContent().build();
    }
}
