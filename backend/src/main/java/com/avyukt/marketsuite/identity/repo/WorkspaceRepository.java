package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.domain.WorkspaceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    List<Workspace> findByOrgId(UUID orgId);

    List<Workspace> findByOrgIdAndStatus(UUID orgId, WorkspaceStatus status);

    List<Workspace> findByOrgIdAndNameContainingIgnoreCase(UUID orgId, String name);

    Optional<Workspace> findByOrgIdAndName(UUID orgId, String name);

    long countByOrgId(UUID orgId);
}
