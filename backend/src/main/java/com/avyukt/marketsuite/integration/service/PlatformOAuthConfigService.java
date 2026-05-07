package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.integration.domain.PlatformOAuthConfig;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.repo.PlatformOAuthConfigRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PlatformOAuthConfigService {

    private final PlatformOAuthConfigRepository repo;

    public PlatformOAuthConfigService(PlatformOAuthConfigRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<PlatformOAuthConfig> listAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public PlatformOAuthConfig getByPlatformType(PlatformType platformType) {
        return repo.findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("PlatformOAuthConfig", "platformType", platformType));
    }

    public PlatformOAuthConfig update(UUID id, String clientId, String encryptedClientSecret, String scopes,
                                       String redirectUri, String extraParamsJson, Boolean enabled) {
        PlatformOAuthConfig config =
                repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("PlatformOAuthConfig", "id", id));
        if (clientId != null) config.setClientId(clientId);
        if (encryptedClientSecret != null) config.setEncryptedClientSecret(encryptedClientSecret);
        if (scopes != null) config.setScopes(scopes);
        if (redirectUri != null) config.setRedirectUri(redirectUri);
        if (extraParamsJson != null) config.setExtraParamsJson(extraParamsJson);
        if (enabled != null) config.setEnabled(enabled);
        return repo.save(config);
    }
}
