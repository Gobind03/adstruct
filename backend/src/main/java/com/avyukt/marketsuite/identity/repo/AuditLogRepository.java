package com.avyukt.marketsuite.identity.repo;

import com.avyukt.marketsuite.identity.domain.AuditLog;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByOrgId(UUID orgId, Pageable pageable);

    @Query(
            value =
                    """
            SELECT * FROM audit_logs a WHERE a.org_id = :orgId
            AND (:workspaceId IS NULL OR a.workspace_id = :workspaceId)
            AND (:actorUserId IS NULL OR a.actor_user_id = :actorUserId)
            AND (CAST(:entityType AS VARCHAR) IS NULL OR a.entity_type = :entityType)
            AND (CAST(:action AS VARCHAR) IS NULL OR a.action = :action)
            AND (CAST(:dateFrom AS TIMESTAMPTZ) IS NULL OR a.created_at >= :dateFrom)
            AND (CAST(:dateTo AS TIMESTAMPTZ) IS NULL OR a.created_at <= :dateTo)
            ORDER BY a.created_at DESC
            """,
            countQuery =
                    """
            SELECT COUNT(*) FROM audit_logs a WHERE a.org_id = :orgId
            AND (:workspaceId IS NULL OR a.workspace_id = :workspaceId)
            AND (:actorUserId IS NULL OR a.actor_user_id = :actorUserId)
            AND (CAST(:entityType AS VARCHAR) IS NULL OR a.entity_type = :entityType)
            AND (CAST(:action AS VARCHAR) IS NULL OR a.action = :action)
            AND (CAST(:dateFrom AS TIMESTAMPTZ) IS NULL OR a.created_at >= :dateFrom)
            AND (CAST(:dateTo AS TIMESTAMPTZ) IS NULL OR a.created_at <= :dateTo)
            """,
            nativeQuery = true)
    Page<AuditLog> findFiltered(
            UUID orgId,
            UUID workspaceId,
            UUID actorUserId,
            String entityType,
            String action,
            OffsetDateTime dateFrom,
            OffsetDateTime dateTo,
            Pageable pageable);
}
