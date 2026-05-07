package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.CompetitorExternalHandle;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompetitorExternalHandleRepository
        extends JpaRepository<CompetitorExternalHandle, UUID> {

    List<CompetitorExternalHandle> findByCompetitorId(UUID competitorId);
}
