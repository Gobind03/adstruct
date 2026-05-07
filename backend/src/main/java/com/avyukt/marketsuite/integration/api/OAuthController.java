package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.IntegrationAccountResponse;
import com.avyukt.marketsuite.integration.api.dto.OAuthInitiateRequest;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.service.OAuthFlowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/oauth")
@Tag(name = "OAuth")
public class OAuthController {

    private final OAuthFlowService oAuthFlowService;

    public OAuthController(OAuthFlowService oAuthFlowService) {
        this.oAuthFlowService = oAuthFlowService;
    }

    @GetMapping("/{platformType}/authorize")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Initiate OAuth flow for a platform")
    public ResponseEntity<Map<String, String>> authorize(
            @PathVariable PlatformType platformType,
            @RequestParam java.util.UUID orgId,
            @RequestParam(required = false) String displayName) {
        String authUrl = oAuthFlowService.initiateOAuth(orgId, platformType, displayName);
        return ResponseEntity.ok(Map.of("authUrl", authUrl));
    }

    @GetMapping("/{platformType}/callback")
    @Operation(summary = "Handle OAuth callback from platform")
    public ResponseEntity<Void> callback(
            @PathVariable PlatformType platformType,
            @RequestParam String code,
            @RequestParam String state) {
        IntegrationAccount account = oAuthFlowService.handleCallback(platformType, code, state);
        String redirectUrl = "/integrations/accounts/" + account.getId() + "?oauth=success";
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(redirectUrl)).build();
    }
}
