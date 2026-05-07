package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.common.secret.SecretStore;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationWebhookEndpointRepository;
import com.avyukt.marketsuite.integration.repo.WebhookDeliveryRepository;
import com.avyukt.marketsuite.integration.service.connectors.*;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final IntegrationWebhookEndpointRepository webhookRepo;
    private final IntegrationAccountRepository accountRepo;
    private final WebhookDeliveryRepository deliveryRepo;
    private final SecretStore secretStore;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ConnectorRegistry connectorRegistry;
    private final ReportDataPersistenceService persistenceService;

    public WebhookService(
            IntegrationWebhookEndpointRepository webhookRepo,
            IntegrationAccountRepository accountRepo,
            WebhookDeliveryRepository deliveryRepo,
            SecretStore secretStore,
            PermissionService permissionService,
            AuditService auditService,
            ConnectorRegistry connectorRegistry,
            ReportDataPersistenceService persistenceService) {
        this.webhookRepo = webhookRepo;
        this.accountRepo = accountRepo;
        this.deliveryRepo = deliveryRepo;
        this.secretStore = secretStore;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.connectorRegistry = connectorRegistry;
        this.persistenceService = persistenceService;
    }

    public IntegrationWebhookEndpoint register(UUID orgId, UUID accountId, String subscribedEventsJson) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));

        String signingSecret = generateSigningSecret();
        String secretRef = "webhook-secret-" + UUID.randomUUID();
        secretStore.store(secretRef, signingSecret);

        String endpointUrl = "/api/v1/webhooks/" + account.getPlatformType().name() + "/receive";

        IntegrationWebhookEndpoint webhook = IntegrationWebhookEndpoint.builder()
                .integrationAccount(account)
                .status(WebhookStatus.ACTIVE)
                .endpointUrl(endpointUrl)
                .secretRef(secretRef)
                .subscribedEventsJson(subscribedEventsJson != null ? subscribedEventsJson : "[]")
                .build();

        webhook = webhookRepo.save(webhook);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "REGISTER_WEBHOOK", "IntegrationWebhookEndpoint",
                webhook.getId(), null, "{\"accountId\":\"" + accountId + "\"}");
        return webhook;
    }

    public IntegrationWebhookEndpoint rotateSecret(UUID orgId, UUID accountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationWebhookEndpoint webhook = webhookRepo
                .findByIntegrationAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationWebhookEndpoint", "accountId", accountId));

        secretStore.delete(webhook.getSecretRef());
        String newSecret = generateSigningSecret();
        String newRef = "webhook-secret-" + UUID.randomUUID();
        secretStore.store(newRef, newSecret);
        webhook.setSecretRef(newRef);
        webhook = webhookRepo.save(webhook);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "ROTATE_WEBHOOK_SECRET",
                "IntegrationWebhookEndpoint", webhook.getId(), null, "{\"rotated\":true}");
        return webhook;
    }

    public IntegrationWebhookEndpoint toggleStatus(UUID orgId, UUID accountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationWebhookEndpoint webhook = webhookRepo
                .findByIntegrationAccountId(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationWebhookEndpoint", "accountId", accountId));

        WebhookStatus newStatus = webhook.getStatus() == WebhookStatus.ACTIVE
                ? WebhookStatus.INACTIVE : WebhookStatus.ACTIVE;
        webhook.setStatus(newStatus);
        if (newStatus == WebhookStatus.ACTIVE) {
            webhook.setErrorMessage(null);
        }
        webhook = webhookRepo.save(webhook);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "TOGGLE_WEBHOOK_STATUS",
                "IntegrationWebhookEndpoint", webhook.getId(), null,
                "{\"newStatus\":\"" + newStatus + "\"}");
        return webhook;
    }

    @Transactional(readOnly = true)
    public IntegrationWebhookEndpoint getByAccountId(UUID accountId) {
        return webhookRepo.findByIntegrationAccountId(accountId).orElse(null);
    }

    public String resolveSecret(IntegrationWebhookEndpoint webhook) {
        if (webhook == null || webhook.getSecretRef() == null) return null;
        return secretStore.retrieve(webhook.getSecretRef());
    }

    @Transactional(readOnly = true)
    public List<WebhookDelivery> getRecentDeliveries(UUID orgId) {
        permissionService.requireOrgAccess(orgId);
        return deliveryRepo.findRecentByOrgId(orgId);
    }

    /**
     * Receives and processes an inbound webhook from an ad platform.
     * Verifies signature, parses payload into CampaignReportRows, persists data,
     * and logs the delivery.
     */
    public void receiveWebhook(PlatformType platformType, String body, String signatureHeader) {
        List<IntegrationWebhookEndpoint> webhooks = webhookRepo.findAll().stream()
                .filter(w -> w.getIntegrationAccount().getPlatformType() == platformType
                        && w.getStatus() == WebhookStatus.ACTIVE)
                .toList();

        if (webhooks.isEmpty()) {
            log.warn("No active webhook registered for platform {}", platformType);
            return;
        }

        for (IntegrationWebhookEndpoint webhook : webhooks) {
            IntegrationAccount account = webhook.getIntegrationAccount();
            IntegrationConnector connector = connectorRegistry.getConnector(platformType).orElse(null);

            if (connector == null) {
                logDelivery(webhook, platformType, "unknown", "ERROR", 0,
                        "No connector registered for " + platformType, body);
                continue;
            }

            String secret = secretStore.retrieve(webhook.getSecretRef());
            if (signatureHeader != null && !signatureHeader.isBlank()) {
                boolean valid = connector.verifyWebhookSignature(body, secret, signatureHeader);
                if (!valid) {
                    log.warn("Webhook signature verification failed for account {}", account.getDisplayName());
                    webhook.setStatus(WebhookStatus.ERROR);
                    webhook.setErrorMessage("Signature verification failed");
                    logDelivery(webhook, platformType, "signature_check", "ERROR", 0,
                            "Signature verification failed", body);
                    webhookRepo.save(webhook);
                    continue;
                }
            }

            try {
                List<CampaignReportRow> rows = connector.parseWebhookPayload(body);
                int processed = 0;
                int errors = 0;

                for (CampaignReportRow row : rows) {
                    try {
                        persistenceService.persistReportRow(row, null, account);
                        processed++;
                    } catch (Exception e) {
                        errors++;
                        log.warn("Failed to persist webhook row for campaign {}: {}",
                                row.externalCampaignId(), e.getMessage());
                    }
                }

                webhook.setLastReceivedAt(OffsetDateTime.now());
                if (webhook.getStatus() == WebhookStatus.ERROR) {
                    webhook.setStatus(WebhookStatus.ACTIVE);
                    webhook.setErrorMessage(null);
                }
                webhookRepo.save(webhook);

                account.setLastSyncAt(OffsetDateTime.now());
                accountRepo.save(account);

                String eventType = rows.isEmpty() ? "no_data" : "campaign_update";
                logDelivery(webhook, platformType, eventType, errors > 0 ? "PARTIAL" : "SUCCESS",
                        processed, errors > 0 ? errors + " rows failed" : null, body);

                log.info("Webhook processed for {} ({}): {} rows persisted, {} errors",
                        account.getDisplayName(), platformType, processed, errors);

            } catch (Exception e) {
                log.error("Webhook processing failed for {}: {}", account.getDisplayName(), e.getMessage());
                webhook.setStatus(WebhookStatus.ERROR);
                webhook.setErrorMessage(truncate(e.getMessage(), 300));
                webhook.setLastReceivedAt(OffsetDateTime.now());
                webhookRepo.save(webhook);
                logDelivery(webhook, platformType, "error", "ERROR", 0,
                        truncate(e.getMessage(), 500), body);
            }
        }
    }

    private void logDelivery(IntegrationWebhookEndpoint webhook, PlatformType platformType,
            String eventType, String status, int rowsProcessed, String errorMessage, String body) {
        String summary = body != null ? truncate(body, 500) : null;
        deliveryRepo.save(WebhookDelivery.builder()
                .webhook(webhook)
                .platformType(platformType)
                .eventType(eventType)
                .status(status)
                .rowsProcessed(rowsProcessed)
                .errorMessage(errorMessage)
                .payloadSummary(summary)
                .build());
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }

    private String generateSigningSecret() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return "whsec_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
