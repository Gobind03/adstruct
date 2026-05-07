package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Membership;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    List<Membership> findByUserId(UUID userId);

    List<Membership> findByOrgId(UUID orgId);

    List<Membership> findByOrgIdAndWorkspaceId(UUID orgId, UUID workspaceId);

    Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId);

    Optional<Membership> findByUserIdAndOrgIdAndWorkspaceId(UUID userId, UUID orgId, UUID workspaceId);

    @Query(
            "SELECT m FROM Membership m WHERE m.user.id = :userId AND m.org.id = :orgId AND m.workspace IS NULL")
    Optional<Membership> findOrgLevelMembership(UUID userId, UUID orgId);

    @Query(
            "SELECT m FROM Membership m JOIN FETCH m.user WHERE m.org.id = :orgId AND m.workspace.id = :workspaceId")
    List<Membership> findByOrgIdAndWorkspaceIdWithUser(UUID orgId, UUID workspaceId);

    @Query("SELECT m FROM Membership m JOIN FETCH m.user WHERE m.org.id = :orgId")
    List<Membership> findByOrgIdWithUser(UUID orgId);

    @Query(
            "SELECT m FROM Membership m WHERE m.user.id = :userId AND m.org.id = :orgId AND (m.workspace IS NULL OR m.workspace.id = :workspaceId)")
    List<Membership> findUserMembershipsInScope(UUID userId, UUID orgId, UUID workspaceId);

    long countByOrgId(UUID orgId);

    boolean existsByUserIdAndOrgIdAndRole(UUID userId, UUID orgId, MemberRole role);
}
