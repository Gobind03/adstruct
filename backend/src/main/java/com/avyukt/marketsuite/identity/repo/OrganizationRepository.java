package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.OrgStatus;
import com.avyukt.marketsuite.identity.domain.Organization;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    List<Organization> findByStatus(OrgStatus status);

    @Query("SELECT DISTINCT m.org FROM Membership m WHERE m.user.id = :userId")
    List<Organization> findByMemberUserId(UUID userId);
}
