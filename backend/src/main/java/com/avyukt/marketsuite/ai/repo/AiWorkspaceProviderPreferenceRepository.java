package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiWorkspaceProviderPreference;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiWorkspaceProviderPreferenceRepository
        extends JpaRepository<AiWorkspaceProviderPreference, UUID> {

    List<AiWorkspaceProviderPreference> findByWorkspaceId(UUID workspaceId);

    Optional<AiWorkspaceProviderPreference> findByWorkspaceIdAndIsDefaultTrue(UUID workspaceId);
}
