package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiProviderConfigRepository extends JpaRepository<AiProviderConfig, UUID> {

    List<AiProviderConfig> findByOrgIdAndEnabled(UUID orgId, boolean enabled);

    Optional<AiProviderConfig> findByIntegrationAccountId(UUID integrationAccountId);
}
