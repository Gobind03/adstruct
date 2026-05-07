package com.avyukt.marketsuite.common.audit;

import com.avyukt.marketsuite.identity.domain.AuditLog;
import com.avyukt.marketsuite.identity.repo.AuditLogRepository;
import com.avyukt.marketsuite.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditAspect(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(auditable)")
    public Object audit(ProceedingJoinPoint joinPoint, Auditable auditable) throws Throwable {
        Object result = joinPoint.proceed();
        try {
            UUID actorUserId = getCurrentUserId();
            String afterJson = objectMapper.writeValueAsString(result);

            AuditLog entry = new AuditLog();
            entry.setActorUserId(actorUserId);
            entry.setAction(auditable.action());
            entry.setEntityType(auditable.entityType());
            entry.setAfterJson(afterJson);
            entry.setCreatedAt(OffsetDateTime.now());
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("Failed to create audit log entry", e);
        }
        return result;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }
}
