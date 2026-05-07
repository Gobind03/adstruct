package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.*;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.service.IntegrationService;
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
@RequestMapping("/api/v1/orgs/{orgId}/integrations/accounts")
@Tag(name = "Integration Accounts")
@SecurityRequirement(name = "bearerAuth")
public class IntegrationAccountsController {

    private final IntegrationService service;

    public IntegrationAccountsController(IntegrationService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List integration accounts for an organization")
    public ResponseEntity<List<IntegrationAccountResponse>> list(
            @PathVariable UUID orgId,
            @RequestParam(required = false) PlatformType platformType,
            @RequestParam(required = false) IntegrationStatus status,
            @RequestParam(required = false) IntegrationCategory category) {
        return ResponseEntity.ok(service.findByOrg(orgId, platformType, status, category).stream()
                .map(IntegrationMapper::toAccountResponse)
                .toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Create a new integration account")
    public ResponseEntity<IntegrationAccountResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody IntegrationAccountCreateRequest request) {
        IntegrationAccount account = service.create(
                orgId,
                PlatformType.valueOf(request.platformType()),
                request.displayName(),
                AuthType.valueOf(request.authType()),
                request.secretPayload(),
                request.scopesJson(),
                request.externalAccountId());
        return ResponseEntity.status(HttpStatus.CREATED).body(IntegrationMapper.toAccountResponse(account));
    }

    @GetMapping("/{accountId}")
    @Operation(summary = "Get integration account by ID")
    public ResponseEntity<IntegrationAccountResponse> getById(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(IntegrationMapper.toAccountResponse(service.findById(orgId, accountId)));
    }

    @PatchMapping("/{accountId}")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Update integration account")
    public ResponseEntity<IntegrationAccountResponse> update(
            @PathVariable UUID orgId, @PathVariable UUID accountId, @RequestBody IntegrationAccountUpdateRequest request) {
        return ResponseEntity.ok(IntegrationMapper.toAccountResponse(
                service.update(orgId, accountId, request.displayName(), request.scopesJson(), request.externalAccountId())));
    }

    @PostMapping("/{accountId}/secrets/rotate")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Rotate secrets for integration account")
    public ResponseEntity<IntegrationAccountResponse> rotateSecrets(
            @PathVariable UUID orgId, @PathVariable UUID accountId, @Valid @RequestBody SecretRotateRequest request) {
        return ResponseEntity.ok(
                IntegrationMapper.toAccountResponse(service.rotateSecrets(orgId, accountId, request.secretPayload())));
    }

    @PostMapping("/{accountId}/validate")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Validate integration connection")
    public ResponseEntity<IntegrationAccountResponse> validate(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(IntegrationMapper.toAccountResponse(service.validateConnection(orgId, accountId)));
    }

    @PostMapping("/{accountId}/disconnect")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @Operation(summary = "Disconnect integration account")
    public ResponseEntity<IntegrationAccountResponse> disconnect(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        return ResponseEntity.ok(IntegrationMapper.toAccountResponse(service.disconnect(orgId, accountId)));
    }
}
