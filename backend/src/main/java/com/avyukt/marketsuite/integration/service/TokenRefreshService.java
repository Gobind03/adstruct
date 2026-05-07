package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.secret.SecretStore;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.IntegrationStatus;
import com.avyukt.marketsuite.integration.domain.PlatformOAuthConfig;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.PlatformOAuthConfigRepository;
import com.avyukt.marketsuite.integration.service.connectors.PlatformRestClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenRefreshService {

    private static final Logger log = LoggerFactory.getLogger(TokenRefreshService.class);
    private final SecretStore secretStore;
    private final PlatformOAuthConfigRepository oauthConfigRepo;
    private final IntegrationAccountRepository accountRepo;
    private final PlatformRestClient restClient;
    private final ObjectMapper objectMapper;

    public TokenRefreshService(
            SecretStore secretStore,
            PlatformOAuthConfigRepository oauthConfigRepo,
            IntegrationAccountRepository accountRepo,
            PlatformRestClient restClient) {
        this.secretStore = secretStore;
        this.oauthConfigRepo = oauthConfigRepo;
        this.accountRepo = accountRepo;
        this.restClient = restClient;
        this.objectMapper = new ObjectMapper();
    }

    public String getAccessToken(IntegrationAccount account) {
        if (account.getSecretRef() == null) {
            return null;
        }
        try {
            String raw = secretStore.retrieve(account.getSecretRef());
            if (raw == null) return null;
            JsonNode secrets = objectMapper.readTree(raw);
            String accessToken = secrets.path("accessToken").asText(null);
            if (accessToken == null) {
                return secrets.path("apiKey").asText(null);
            }
            String expiresAtStr = secrets.path("expiresAt").asText(null);
            if (expiresAtStr != null) {
                OffsetDateTime expiresAt = OffsetDateTime.parse(expiresAtStr);
                if (expiresAt.isBefore(OffsetDateTime.now().plusMinutes(5))) {
                    String refreshToken = secrets.path("refreshToken").asText(null);
                    if (refreshToken != null) {
                        return refreshAccessToken(account, refreshToken);
                    }
                }
            }
            return accessToken;
        } catch (Exception e) {
            log.warn("Failed to retrieve access token for account {}: {}", account.getId(), e.getMessage());
            return null;
        }
    }

    @Transactional
    public String refreshAccessToken(IntegrationAccount account, String refreshToken) {
        try {
            PlatformOAuthConfig config = oauthConfigRepo
                    .findByPlatformType(account.getPlatformType())
                    .orElse(null);
            if (config == null) {
                log.warn("No OAuth config for platform {}", account.getPlatformType());
                return null;
            }

            Map<String, String> params = new LinkedHashMap<>();
            params.put("client_id", config.getClientId());
            params.put("client_secret", config.getEncryptedClientSecret());
            params.put("refresh_token", refreshToken);
            params.put("grant_type", "refresh_token");

            JsonNode resp = restClient.postFormForToken(config.getTokenUrl(), params);
            String newAccessToken = resp.path("access_token").asText(null);
            String newRefreshToken = resp.path("refresh_token").asText(refreshToken);
            long expiresIn = resp.path("expires_in").asLong(3600);

            if (newAccessToken != null) {
                Map<String, Object> secretPayload = new LinkedHashMap<>();
                secretPayload.put("accessToken", newAccessToken);
                secretPayload.put("refreshToken", newRefreshToken);
                secretPayload.put("expiresAt", OffsetDateTime.now().plusSeconds(expiresIn).toString());
                secretStore.store(account.getSecretRef(), objectMapper.writeValueAsString(secretPayload));
                log.info("Token refreshed for account {}", account.getId());
                return newAccessToken;
            } else {
                markAccountRevoked(account);
                return null;
            }
        } catch (Exception e) {
            log.error("Token refresh failed for account {}: {}", account.getId(), e.getMessage());
            markAccountRevoked(account);
            return null;
        }
    }

    private void markAccountRevoked(IntegrationAccount account) {
        account.setStatus(IntegrationStatus.REVOKED);
        account.setErrorCode("TOKEN_REVOKED");
        account.setErrorMessage("OAuth token refresh failed; re-authorization required");
        accountRepo.save(account);
    }
}
