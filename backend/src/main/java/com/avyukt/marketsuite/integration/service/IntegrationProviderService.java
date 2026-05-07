package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.IntegrationProvider;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.repo.IntegrationProviderRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class IntegrationProviderService {

    private final IntegrationProviderRepository repo;

    public IntegrationProviderService(IntegrationProviderRepository repo) {
        this.repo = repo;
    }

    public List<IntegrationProvider> list(IntegrationCategory category) {
        if (category != null) {
            return repo.findByCategory(category);
        }
        return repo.findAll();
    }

    public IntegrationProvider getByPlatformType(PlatformType platformType) {
        return repo.findByPlatformType(platformType)
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationProvider", "platformType", platformType));
    }
}
