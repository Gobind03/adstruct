package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.common.secret.SecretStore;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.*;
import com.avyukt.marketsuite.integration.service.connectors.PlatformRestClient;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OAuthFlowService {

    private static final Logger log = LoggerFactory.getLogger(OAuthFlowService.class);
    private final PlatformOAuthConfigRepository oauthConfigRepo;
    private final OAuthStateTokenRepository stateTokenRepo;
    private final IntegrationAccountRepository accountRepo;
    private final IntegrationProviderRepository providerRepo;
    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final SecretStore secretStore;
    private final PlatformRestClient restClient;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public OAuthFlowService(
            PlatformOAuthConfigRepository oauthConfigRepo,
            OAuthStateTokenRepository stateTokenRepo,
            IntegrationAccountRepository accountRepo,
            IntegrationProviderRepository providerRepo,
            OrganizationRepository orgRepo,
            UserRepository userRepo,
            SecretStore secretStore,
            PlatformRestClient restClient,
            AuditService auditService) {
        this.oauthConfigRepo = oauthConfigRepo;
        this.stateTokenRepo = stateTokenRepo;
        this.accountRepo = accountRepo;
        this.providerRepo = providerRepo;
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
        this.secretStore = secretStore;
        this.restClient = restClient;
        this.auditService = auditService;
        this.objectMapper = new ObjectMapper();
    }

    public String initiateOAuth(UUID orgId, PlatformType platformType, String displayName) {
        PlatformOAuthConfig config = oauthConfigRepo
                .findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("PlatformOAuthConfig", "platformType", platformType));

        if (!config.isEnabled()) {
            throw new IllegalStateException("OAuth is not enabled for " + platformType);
        }

        UUID userId = SecurityUtils.currentUserId();
        Organization org =
                orgRepo.findById(orgId).orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
        AppUser user =
                userRepo.findById(userId).orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        String state = generateState();
        OAuthStateToken stateToken = OAuthStateToken.builder()
                .state(state)
                .platformType(platformType)
                .org(org)
                .user(user)
                .displayName(displayName)
                .expiresAt(OffsetDateTime.now().plusMinutes(10))
                .build();
        stateTokenRepo.save(stateToken);

        String authUrl = buildAuthorizationUrl(config, state);
        log.info("OAuth flow initiated for platform={} org={}", platformType, orgId);
        return authUrl;
    }

    public IntegrationAccount handleCallback(PlatformType platformType, String code, String state) {
        OAuthStateToken stateToken = stateTokenRepo
                .findByStateAndUsedFalse(state)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OAuth state token"));

        if (stateToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("OAuth state token has expired");
        }
        if (stateToken.getPlatformType() != platformType) {
            throw new IllegalArgumentException("Platform type mismatch in OAuth callback");
        }

        stateToken.setUsed(true);
        stateTokenRepo.save(stateToken);

        PlatformOAuthConfig config = oauthConfigRepo
                .findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("PlatformOAuthConfig", "platformType", platformType));

        JsonNode tokenResponse = exchangeCodeForTokens(config, code);
        String accessToken = tokenResponse.path("access_token").asText();
        String refreshToken = tokenResponse.path("refresh_token").asText(null);
        long expiresIn = tokenResponse.path("expires_in").asLong(3600);

        String secretRef = "oauth-" + platformType.name().toLowerCase() + "-" + UUID.randomUUID();
        try {
            Map<String, Object> secretPayload = new HashMap<>();
            secretPayload.put("accessToken", accessToken);
            if (refreshToken != null) secretPayload.put("refreshToken", refreshToken);
            secretPayload.put("expiresAt", OffsetDateTime.now().plusSeconds(expiresIn).toString());
            secretStore.store(secretRef, objectMapper.writeValueAsString(secretPayload));
        } catch (Exception e) {
            throw new RuntimeException("Failed to store OAuth tokens", e);
        }

        IntegrationProvider provider = providerRepo
                .findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationProvider", "platformType", platformType));

        String displayName = stateToken.getDisplayName() != null
                ? stateToken.getDisplayName()
                : platformType.name() + " Account";

        IntegrationAccount account = IntegrationAccount.builder()
                .org(stateToken.getOrg())
                .provider(provider)
                .platformType(platformType)
                .displayName(displayName)
                .status(IntegrationStatus.CONNECTED)
                .authType(AuthType.OAUTH2)
                .secretRef(secretRef)
                .scopesJson("[\"" + config.getScopes().replace(",", "\",\"") + "\"]")
                .connectedByUser(stateToken.getUser())
                .lastValidatedAt(OffsetDateTime.now())
                .build();

        account = accountRepo.save(account);

        auditService.log(
                stateToken.getOrg().getId(),
                null,
                stateToken.getUser().getId(),
                "CREATE_OAUTH_ACCOUNT",
                "IntegrationAccount",
                account.getId(),
                null,
                "{\"platformType\":\"" + platformType + "\",\"displayName\":\"" + displayName + "\"}");

        log.info("OAuth account created: id={} platform={}", account.getId(), platformType);
        return account;
    }

    private String buildAuthorizationUrl(PlatformOAuthConfig config, String state) {
        StringBuilder url = new StringBuilder(config.getAuthUrl());
        url.append("?client_id=").append(encode(config.getClientId()));
        url.append("&redirect_uri=").append(encode(config.getRedirectUri()));
        url.append("&state=").append(encode(state));
        url.append("&response_type=code");

        if (!config.getScopes().isBlank() && !"scope_not_applicable".equals(config.getScopes())) {
            url.append("&scope=").append(encode(config.getScopes()));
        }

        try {
            JsonNode extraParams = objectMapper.readTree(config.getExtraParamsJson());
            extraParams
                    .fields()
                    .forEachRemaining(e -> url.append("&")
                            .append(encode(e.getKey()))
                            .append("=")
                            .append(encode(e.getValue().asText())));
        } catch (Exception ignored) {
        }

        return url.toString();
    }

    private JsonNode exchangeCodeForTokens(PlatformOAuthConfig config, String code) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("client_id", config.getClientId());
        params.put("client_secret", decryptClientSecret(config.getEncryptedClientSecret()));
        params.put("code", code);
        params.put("redirect_uri", config.getRedirectUri());
        params.put("grant_type", "authorization_code");
        return restClient.postFormForToken(config.getTokenUrl(), params);
    }

    private String decryptClientSecret(String encrypted) {
        if (encrypted.startsWith("PLACEHOLDER")) {
            return encrypted;
        }
        String retrieved = secretStore.retrieve("oauth-client-secret-" + encrypted.hashCode());
        return retrieved != null ? retrieved : encrypted;
    }

    private String generateState() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
