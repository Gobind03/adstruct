package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.PlatformOAuthConfig;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlatformOAuthConfigRepository extends JpaRepository<PlatformOAuthConfig, UUID> {

    Optional<PlatformOAuthConfig> findByPlatformType(PlatformType platformType);

    List<PlatformOAuthConfig> findByEnabled(boolean enabled);
}
