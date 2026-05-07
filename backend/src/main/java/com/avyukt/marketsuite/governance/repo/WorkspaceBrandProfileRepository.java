package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.WorkspaceBrandProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceBrandProfileRepository extends JpaRepository<WorkspaceBrandProfile, UUID> {

    Optional<WorkspaceBrandProfile> findByWorkspaceId(UUID workspaceId);

    boolean existsByWorkspaceId(UUID workspaceId);
}
