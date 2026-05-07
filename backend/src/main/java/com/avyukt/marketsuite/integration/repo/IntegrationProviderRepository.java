package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.IntegrationCategory;
import com.avyukt.marketsuite.integration.domain.IntegrationProvider;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IntegrationProviderRepository extends JpaRepository<IntegrationProvider, UUID> {

    Optional<IntegrationProvider> findByPlatformType(PlatformType platformType);

    List<IntegrationProvider> findByCategory(IntegrationCategory category);
}
