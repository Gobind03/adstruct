package com.avyukt.marketsuite.integration.api;

import com.avyukt.marketsuite.integration.api.dto.WebhookDeliveryResponse;
import com.avyukt.marketsuite.integration.api.dto.WebhookRegisterRequest;
import com.avyukt.marketsuite.integration.api.dto.WebhookResponse;
import com.avyukt.marketsuite.integration.api.mapper.IntegrationMapper;
import com.avyukt.marketsuite.integration.domain.IntegrationWebhookEndpoint;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.service.WebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@Tag(name = "Webhooks")
public class WebhooksController {

    private final WebhookService service;

    public WebhooksController(WebhookService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/webhook/register")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Register webhook for integration account")
    public ResponseEntity<WebhookResponse> register(
            @PathVariable UUID orgId, @PathVariable UUID accountId, @RequestBody WebhookRegisterRequest request) {
        IntegrationWebhookEndpoint webhook = service.register(orgId, accountId, request.subscribedEventsJson());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(IntegrationMapper.toWebhookResponse(webhook, service.resolveSecret(webhook)));
    }

    @PostMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/webhook/rotate-secret")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Rotate webhook signing secret")
    public ResponseEntity<WebhookResponse> rotateSecret(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        IntegrationWebhookEndpoint webhook = service.rotateSecret(orgId, accountId);
        return ResponseEntity.ok(IntegrationMapper.toWebhookResponse(webhook, service.resolveSecret(webhook)));
    }

    @PostMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/webhook/toggle-status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Pause or resume a webhook")
    public ResponseEntity<WebhookResponse> toggleStatus(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        IntegrationWebhookEndpoint webhook = service.toggleStatus(orgId, accountId);
        return ResponseEntity.ok(IntegrationMapper.toWebhookResponse(webhook, service.resolveSecret(webhook)));
    }

    @GetMapping("/api/v1/orgs/{orgId}/integrations/accounts/{accountId}/webhook")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get webhook status for integration account")
    public ResponseEntity<WebhookResponse> getWebhook(@PathVariable UUID orgId, @PathVariable UUID accountId) {
        IntegrationWebhookEndpoint webhook = service.getByAccountId(accountId);
        if (webhook == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(IntegrationMapper.toWebhookResponse(webhook, service.resolveSecret(webhook)));
    }

    @GetMapping("/api/v1/orgs/{orgId}/integrations/webhooks/deliveries")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List recent webhook deliveries for the organization")
    public ResponseEntity<List<WebhookDeliveryResponse>> listDeliveries(@PathVariable UUID orgId) {
        return ResponseEntity.ok(
                service.getRecentDeliveries(orgId).stream()
                        .map(IntegrationMapper::toDeliveryResponse)
                        .toList());
    }

    /**
     * Meta webhook verification challenge endpoint.
     * Meta sends GET with hub.mode, hub.verify_token, hub.challenge to verify the endpoint.
     */
    @GetMapping("/api/v1/webhooks/{platformType}/receive")
    @Operation(summary = "Webhook verification challenge (Meta)")
    public ResponseEntity<String> verifyChallenge(
            @PathVariable PlatformType platformType,
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String verifyToken,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {
        if ("subscribe".equals(mode) && challenge != null) {
            return ResponseEntity.ok(challenge);
        }
        return ResponseEntity.badRequest().body("Invalid verification request");
    }

    @PostMapping("/api/v1/webhooks/{platformType}/receive")
    @Operation(summary = "Receive webhook from platform (public)")
    public ResponseEntity<Void> receive(
            @PathVariable PlatformType platformType,
            @RequestBody String body,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String metaSignature,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String signature = metaSignature != null ? metaSignature : authHeader;
        service.receiveWebhook(platformType, body, signature);
        return ResponseEntity.ok().build();
    }
}
