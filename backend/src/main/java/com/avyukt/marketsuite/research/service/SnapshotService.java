package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.ResearchSource;
import com.avyukt.marketsuite.research.domain.Sentiment;
import com.avyukt.marketsuite.research.domain.SnapshotType;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.repo.ResearchSourceRepository;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SnapshotService {

    private final SourceSnapshotRepository snapshotRepository;
    private final ResearchSourceRepository researchSourceRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public SnapshotService(
            SourceSnapshotRepository snapshotRepository,
            ResearchSourceRepository researchSourceRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.snapshotRepository = snapshotRepository;
        this.researchSourceRepository = researchSourceRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<SourceSnapshot> listBySource(UUID sourceId) {
        ResearchSource src = researchSourceRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSource", "id", sourceId));
        UUID workspaceId = src.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return snapshotRepository.findBySourceIdOrderByCapturedAtDesc(sourceId);
    }

    @Transactional(readOnly = true)
    public List<SourceSnapshot> listByWorkspace(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return snapshotRepository.findByWorkspaceIdOrderByCapturedAtDesc(workspaceId);
    }

    @Transactional(readOnly = true)
    public SourceSnapshot get(UUID workspaceId, UUID snapshotId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        SourceSnapshot snap = snapshotRepository
                .findById(snapshotId)
                .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", snapshotId));
        assertWorkspaceMatch(snap, workspaceId);
        return snap;
    }

    public SourceSnapshot create(
            UUID workspaceId,
            UUID sourceId,
            SnapshotType snapshotType,
            String title,
            String summaryText,
            String rawText,
            String rawJson,
            String sentiment,
            String tagsJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        ResearchSource src = researchSourceRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSource", "id", sourceId));
        if (!src.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("ResearchSource", "id", sourceId);
        }
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        OffsetDateTime now = OffsetDateTime.now();
        SourceSnapshot snap = SourceSnapshot.builder()
                .workspace(ws)
                .source(src)
                .snapshotType(snapshotType)
                .capturedAt(now)
                .title(title)
                .summaryText(summaryText)
                .rawText(rawText)
                .rawJson(rawJson)
                .sentiment(parseSentiment(sentiment))
                .tags(tagsJson != null ? tagsJson : "[]")
                .createdByUser(user)
                .build();
        SourceSnapshot saved = snapshotRepository.save(snap);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SNAPSHOT_CREATE",
                "SourceSnapshot",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID snapshotId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        SourceSnapshot snap = snapshotRepository
                .findById(snapshotId)
                .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", snapshotId));
        assertWorkspaceMatch(snap, workspaceId);
        String before = toJson(snap);
        UUID actor = SecurityUtils.currentUserId();
        snapshotRepository.delete(snap);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SNAPSHOT_DELETE",
                "SourceSnapshot",
                snapshotId,
                before,
                null);
    }

    public SourceSnapshot updateSummary(UUID snapshotId, String summaryText, String sentiment, String tagsJson) {
        SourceSnapshot snap = snapshotRepository
                .findById(snapshotId)
                .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", snapshotId));
        UUID workspaceId = snap.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        String before = toJson(snap);
        UUID actor = SecurityUtils.currentUserId();
        if (summaryText != null) {
            snap.setSummaryText(summaryText);
        }
        if (sentiment != null) {
            snap.setSentiment(parseSentiment(sentiment));
        }
        if (tagsJson != null) {
            snap.setTags(tagsJson);
        }
        SourceSnapshot saved = snapshotRepository.save(snap);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SNAPSHOT_UPDATE_SUMMARY",
                "SourceSnapshot",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    private Sentiment parseSentiment(String s) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return Sentiment.valueOf(s);
    }

    private void assertWorkspaceMatch(SourceSnapshot snap, UUID workspaceId) {
        if (!snap.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("SourceSnapshot", "id", snap.getId());
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
