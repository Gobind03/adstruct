package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.common.secret.SecretStore;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationProviderRepository;
import com.avyukt.marketsuite.integration.service.connectors.ConnectorRegistry;
import com.avyukt.marketsuite.integration.service.connectors.IntegrationConnector;
import com.avyukt.marketsuite.integration.service.connectors.ValidationResult;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class IntegrationService {

    private final IntegrationAccountRepository accountRepo;
    private final IntegrationProviderRepository providerRepo;
    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final SecretStore secretStore;
    private final AuditService auditService;
    private final PermissionService permissionService;
    private final ConnectorRegistry connectorRegistry;
    private final TokenRefreshService tokenRefreshService;
    private final ObjectMapper objectMapper;

    public IntegrationService(
            IntegrationAccountRepository accountRepo,
            IntegrationProviderRepository providerRepo,
            OrganizationRepository orgRepo,
            UserRepository userRepo,
            SecretStore secretStore,
            AuditService auditService,
            PermissionService permissionService,
            ConnectorRegistry connectorRegistry,
            TokenRefreshService tokenRefreshService) {
        this.accountRepo = accountRepo;
        this.providerRepo = providerRepo;
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
        this.secretStore = secretStore;
        this.auditService = auditService;
        this.permissionService = permissionService;
        this.connectorRegistry = connectorRegistry;
        this.tokenRefreshService = tokenRefreshService;
        this.objectMapper = new ObjectMapper();
    }

    public IntegrationAccount create(
            UUID orgId,
            PlatformType platformType,
            String displayName,
            AuthType authType,
            Map<String, String> secretPayload,
            String scopesJson,
            String externalAccountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        Organization org = orgRepo.findById(orgId).orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
        UUID userId = SecurityUtils.currentUserId();
        AppUser user = userRepo.findById(userId).orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));
        IntegrationProvider provider = providerRepo
                .findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationProvider", "platformType", platformType));

        String secretRef = "integration-secret-" + UUID.randomUUID();
        if (secretPayload != null && !secretPayload.isEmpty()) {
            try {
                secretStore.store(secretRef, objectMapper.writeValueAsString(secretPayload));
            } catch (Exception e) {
                throw new RuntimeException("Failed to store secrets", e);
            }
        }

        IntegrationAccount account = IntegrationAccount.builder()
                .org(org)
                .provider(provider)
                .platformType(platformType)
                .displayName(displayName)
                .status(IntegrationStatus.CONNECTED)
                .authType(authType)
                .secretRef(secretRef)
                .scopesJson(scopesJson)
                .externalAccountId(externalAccountId)
                .connectedByUser(user)
                .build();

        account = accountRepo.save(account);

        auditService.log(orgId, null, userId, "CREATE_INTEGRATION_ACCOUNT", "IntegrationAccount", account.getId(), null,
                "{\"platformType\":\"" + platformType + "\",\"displayName\":\"" + displayName + "\"}");

        return accountRepo.findByIdEager(account.getId()).orElse(account);
    }

    @Transactional(readOnly = true)
    public List<IntegrationAccount> findByOrg(UUID orgId, PlatformType platformType, IntegrationStatus status, IntegrationCategory category) {
        permissionService.requireOrgAccess(orgId);
        return accountRepo.findFiltered(orgId, platformType, status, category);
    }

    @Transactional(readOnly = true)
    public IntegrationAccount findById(UUID orgId, UUID accountId) {
        permissionService.requireOrgAccess(orgId);
        IntegrationAccount account =
                accountRepo.findByIdEager(accountId).orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        if (!account.getOrg().getId().equals(orgId)) {
            throw new ResourceNotFoundException("IntegrationAccount", "id", accountId);
        }
        return account;
    }

    public IntegrationAccount validateConnection(UUID orgId, UUID accountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo.findByIdEager(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        String token = tokenRefreshService.getAccessToken(account);
        IntegrationConnector connector = connectorRegistry.getConnector(account.getPlatformType()).orElse(null);

        if (connector != null && token != null) {
            ValidationResult result = connector.validate(token);
            if (result.valid()) {
                account.setStatus(IntegrationStatus.CONNECTED);
                account.setLastValidatedAt(OffsetDateTime.now());
                account.setErrorCode(null);
                account.setErrorMessage(null);
            } else {
                account.setStatus(IntegrationStatus.ERROR);
                account.setErrorCode("VALIDATION_FAILED");
                account.setErrorMessage(result.message());
            }
        } else {
            account.setLastValidatedAt(OffsetDateTime.now());
        }

        account = accountRepo.save(account);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "VALIDATE_INTEGRATION", "IntegrationAccount",
                accountId, null, "{\"status\":\"" + account.getStatus() + "\"}");
        return accountRepo.findByIdEager(account.getId()).orElse(account);
    }

    public IntegrationAccount disconnect(UUID orgId, UUID accountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo.findByIdEager(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        String beforeStatus = account.getStatus().name();

        account.setStatus(IntegrationStatus.DISCONNECTED);
        if (account.getSecretRef() != null) {
            secretStore.delete(account.getSecretRef());
        }
        account = accountRepo.save(account);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "DISCONNECT_INTEGRATION", "IntegrationAccount",
                accountId, "{\"status\":\"" + beforeStatus + "\"}", "{\"status\":\"DISCONNECTED\"}");
        return accountRepo.findByIdEager(account.getId()).orElse(account);
    }

    public IntegrationAccount update(UUID orgId, UUID accountId, String displayName, String scopesJson, String externalAccountId) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo.findByIdEager(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));
        if (displayName != null) account.setDisplayName(displayName);
        if (scopesJson != null) account.setScopesJson(scopesJson);
        if (externalAccountId != null) account.setExternalAccountId(externalAccountId);
        account = accountRepo.save(account);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE_INTEGRATION_ACCOUNT", "IntegrationAccount",
                accountId, null, "{\"displayName\":\"" + account.getDisplayName() + "\"}");
        return accountRepo.findByIdEager(account.getId()).orElse(account);
    }

    public IntegrationAccount rotateSecrets(UUID orgId, UUID accountId, Map<String, String> newSecretPayload) {
        permissionService.requireOrgRole(orgId, MemberRole.ORG_ADMIN);
        IntegrationAccount account = accountRepo.findByIdEager(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", accountId));

        if (account.getSecretRef() != null) {
            secretStore.delete(account.getSecretRef());
        }
        String newRef = "integration-secret-" + UUID.randomUUID();
        try {
            secretStore.store(newRef, objectMapper.writeValueAsString(newSecretPayload));
        } catch (Exception e) {
            throw new RuntimeException("Failed to store rotated secrets", e);
        }
        account.setSecretRef(newRef);
        account = accountRepo.save(account);

        auditService.log(orgId, null, SecurityUtils.currentUserId(), "ROTATE_SECRET", "IntegrationAccount",
                accountId, null, "{\"secretRotated\":true}");
        return accountRepo.findByIdEager(account.getId()).orElse(account);
    }
}
