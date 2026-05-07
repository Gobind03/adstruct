package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.Team;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {

    List<Team> findByOrgId(UUID orgId);

    List<Team> findByOrgIdAndWorkspaceId(UUID orgId, UUID workspaceId);
}
