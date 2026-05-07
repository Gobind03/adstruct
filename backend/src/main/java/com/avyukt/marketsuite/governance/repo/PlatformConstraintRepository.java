package com.avyukt.marketsuite.governance.repo;

import com.avyukt.marketsuite.governance.domain.PlatformConstraint;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformConstraintRepository extends JpaRepository<PlatformConstraint, UUID> {

    List<PlatformConstraint> findByPlatformType(PlatformType platformType);
}
