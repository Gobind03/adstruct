package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.OrgBrandProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrgBrandProfileRepository extends JpaRepository<OrgBrandProfile, UUID> {

    Optional<OrgBrandProfile> findByOrgId(UUID orgId);

    boolean existsByOrgId(UUID orgId);
}
