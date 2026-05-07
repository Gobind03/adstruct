package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.OAuthConfigResponse;
import com.avyukt.marketsuite.integration.api.dto.OAuthConfigUpdateRequest;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.service.PlatformOAuthConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/oauth-configs")
@Tag(name = "OAuth Configurations (Admin)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ORG_ADMIN')")
public class PlatformOAuthConfigController {

    private final PlatformOAuthConfigService service;

    public PlatformOAuthConfigController(PlatformOAuthConfigService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List all OAuth configurations")
    public ResponseEntity<List<OAuthConfigResponse>> list() {
        return ResponseEntity.ok(
                service.listAll().stream().map(IntegrationMapper::toOAuthConfigResponse).toList());
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update OAuth configuration")
    public ResponseEntity<OAuthConfigResponse> update(
            @PathVariable UUID id, @RequestBody OAuthConfigUpdateRequest request) {
        return ResponseEntity.ok(IntegrationMapper.toOAuthConfigResponse(service.update(
                id,
                request.clientId(),
                request.clientSecret(),
                request.scopes(),
                request.redirectUri(),
                request.extraParamsJson(),
                request.enabled())));
    }
}
