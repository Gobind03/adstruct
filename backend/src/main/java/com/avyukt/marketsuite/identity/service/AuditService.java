package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.identity.api.dto.AuditLogResponse;
import com.avyukt.marketsuite.identity.domain.AuditLog;
import com.avyukt.marketsuite.identity.repo.AuditLogRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void log(
            UUID orgId,
            UUID workspaceId,
            UUID actorUserId,
            String action,
            String entityType,
            UUID entityId,
            String beforeJson,
            String afterJson) {
        AuditLog entry = AuditLog.builder()
                .orgId(orgId)
                .workspaceId(workspaceId)
                .actorUserId(actorUserId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .beforeJson(beforeJson)
                .afterJson(afterJson)
                .createdAt(OffsetDateTime.now())
                .build();
        repository.save(entry);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> findFiltered(
            UUID orgId,
            UUID workspaceId,
            UUID actorUserId,
            String entityType,
            String action,
            OffsetDateTime dateFrom,
            OffsetDateTime dateTo,
            Pageable pageable) {
        return repository
                .findFiltered(orgId, workspaceId, actorUserId, entityType, action, dateFrom, dateTo, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> findByOrg(UUID orgId, Pageable pageable) {
        return repository.findByOrgId(orgId, pageable);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(),
                log.getOrgId(),
                log.getWorkspaceId(),
                log.getActorUserId(),
                log.getAction(),
                log.getEntityType(),
                log.getEntityId(),
                log.getBeforeJson(),
                log.getAfterJson(),
                log.getCreatedAt());
    }
}
