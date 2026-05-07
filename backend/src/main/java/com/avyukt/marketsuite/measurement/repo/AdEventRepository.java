package com.avyukt.marketsuite.measurement.repo;

import com.avyukt.marketsuite.measurement.domain.AdEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AdEventRepository extends JpaRepository<AdEvent, UUID> {

    @Query("SELECT e.campaignId, e.eventType, CAST(e.eventTime AS LocalDate), COUNT(e) " +
           "FROM AdEvent e " +
           "WHERE e.workspaceId = :workspaceId " +
           "AND (:campaignId IS NULL OR e.campaignId = :campaignId) " +
           "AND e.eventTime >= :from AND e.eventTime <= :to " +
           "GROUP BY e.campaignId, e.eventType, CAST(e.eventTime AS LocalDate) " +
           "ORDER BY CAST(e.eventTime AS LocalDate) DESC")
    List<Object[]> findEventSummary(
            @Param("workspaceId") UUID workspaceId,
            @Param("campaignId") UUID campaignId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to);
}
