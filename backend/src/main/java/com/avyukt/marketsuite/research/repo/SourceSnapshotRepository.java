package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SourceSnapshotRepository extends JpaRepository<SourceSnapshot, UUID> {

    List<SourceSnapshot> findBySourceIdOrderByCapturedAtDesc(UUID sourceId);

    List<SourceSnapshot> findByWorkspaceIdOrderByCapturedAtDesc(UUID workspaceId);

    List<SourceSnapshot> findByWorkspaceIdAndCapturedAtBetween(
            UUID workspaceId, OffsetDateTime start, OffsetDateTime end);

    long countByWorkspaceId(UUID workspaceId);
}
