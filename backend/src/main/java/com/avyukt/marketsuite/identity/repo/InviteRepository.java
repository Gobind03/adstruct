package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.Invite;
import com.avyukt.marketsuite.identity.domain.InviteStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InviteRepository extends JpaRepository<Invite, UUID> {

    List<Invite> findByOrgId(UUID orgId);

    List<Invite> findByOrgIdAndStatus(UUID orgId, InviteStatus status);

    List<Invite> findByOrgIdAndWorkspaceId(UUID orgId, UUID workspaceId);

    List<Invite> findByOrgIdAndWorkspaceIdAndStatus(UUID orgId, UUID workspaceId, InviteStatus status);

    boolean existsByOrgIdAndWorkspaceIdAndEmailAndStatus(
            UUID orgId, UUID workspaceId, String email, InviteStatus status);

    boolean existsByOrgIdAndEmailAndStatusAndWorkspaceIsNull(UUID orgId, String email, InviteStatus status);
}
