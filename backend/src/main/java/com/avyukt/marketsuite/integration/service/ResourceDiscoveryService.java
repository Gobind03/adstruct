package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.IntegrationResource;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationResourceRepository;
import com.avyukt.marketsuite.integration.service.connectors.ConnectorRegistry;
import com.avyukt.marketsuite.integration.service.connectors.DiscoveredResource;
import com.avyukt.marketsuite.integration.service.connectors.IntegrationConnector;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResourceDiscoveryService {

    private final IntegrationAccountRepository accountRepo;
    private final IntegrationResourceRepository resourceRepo;
    private final ConnectorRegistry connectorRegistry;
    private final TokenRefreshService tokenRefreshService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ResourceDiscoveryService(
            IntegrationAccountRepository accountRepo,
            IntegrationResourceRepository resourceRepo,
            ConnectorRegistry connectorRegistry,
            TokenRefreshService tokenRefreshService,
            PermissionService permissionService,
            AuditService auditService) {
        this.accountRepo = accountRepo;
        this.resourceRepo = resourceRepo;
        this.connectorRegistry = connectorRegistry;
        this.tokenRefreshService = tokenRefreshService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = new ObjectMapper();
    }

    public List<IntegrationResource> discover(UUID orgId, UUID accountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo
                .findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));

        IntegrationConnector connector = connectorRegistry
                .getConnector(account.getPlatformType())
                .orElseThrow(() -> new IllegalStateException("No connector for " + account.getPlatformType()));

        String token = tokenRefreshService.getAccessToken(account);
        List<DiscoveredResource> discovered = connector.discoverResources(token, account.getExternalAccountId());

        for (DiscoveredResource dr : discovered) {
            var existing = resourceRepo.findByIntegrationAccountIdAndResourceTypeAndExternalResourceId(
                    accountId, dr.type(), dr.externalResourceId());
            if (existing.isPresent()) {
                IntegrationResource res = existing.get();
                res.setDisplayName(dr.displayName());
                res.setLastDiscoveredAt(OffsetDateTime.now());
                try {
                    res.setMetaJson(objectMapper.writeValueAsString(dr.meta()));
                } catch (Exception ignored) {
                }
                resourceRepo.save(res);
            } else {
                String metaJsonStr = "{}";
                try {
                    metaJsonStr = objectMapper.writeValueAsString(dr.meta());
                } catch (Exception ignored) {
                }
                resourceRepo.save(IntegrationResource.builder()
                        .integrationAccount(account)
                        .resourceType(dr.type())
                        .externalResourceId(dr.externalResourceId())
                        .displayName(dr.displayName())
                        .metaJson(metaJsonStr)
                        .lastDiscoveredAt(OffsetDateTime.now())
                        .build());
            }
        }

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "DISCOVER_RESOURCES", "IntegrationAccount",
                accountId, null, "{\"discovered\":" + discovered.size() + "}");

        return resourceRepo.findByIntegrationAccountId(accountId);
    }

    @Transactional(readOnly = true)
    public List<IntegrationResource> listResources(UUID accountId) {
        return resourceRepo.findByIntegrationAccountId(accountId);
    }

    public IntegrationResource updateResource(UUID orgId, UUID resourceId, Boolean enabled, String displayName) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationResource resource = resourceRepo
                .findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationResource", "id", resourceId));
        if (enabled != null) {
            resource.setStatus(enabled
                    ? com.avyukt.marketsuite.integration.domain.ResourceStatus.ENABLED
                    : com.avyukt.marketsuite.integration.domain.ResourceStatus.DISABLED);
        }
        if (displayName != null) resource.setDisplayName(displayName);

        resource = resourceRepo.save(resource);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE_RESOURCE", "IntegrationResource",
                resourceId, null, "{\"status\":\"" + resource.getStatus() + "\"}");
        return resource;
    }
}
