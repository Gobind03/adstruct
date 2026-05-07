package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.InsightEvidence;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InsightEvidenceRepository extends JpaRepository<InsightEvidence, UUID> {

    List<InsightEvidence> findByInsightId(UUID insightId);

    long countByInsightId(UUID insightId);
}
