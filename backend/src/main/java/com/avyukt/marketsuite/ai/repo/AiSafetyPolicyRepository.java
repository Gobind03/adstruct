package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiSafetyPolicy;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiSafetyPolicyRepository extends JpaRepository<AiSafetyPolicy, UUID> {

    Optional<AiSafetyPolicy> findByWorkspaceId(UUID workspaceId);
}
