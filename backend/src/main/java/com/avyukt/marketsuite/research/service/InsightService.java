package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.research.domain.ConfidenceLevel;
import com.avyukt.marketsuite.research.domain.Insight;
import com.avyukt.marketsuite.research.domain.InsightEvidence;
import com.avyukt.marketsuite.research.domain.InsightStatus;
import com.avyukt.marketsuite.research.domain.InsightType;
import com.avyukt.marketsuite.research.domain.ResearchCategory;
import com.avyukt.marketsuite.research.repo.CompetitorRepository;
import com.avyukt.marketsuite.research.repo.InsightEvidenceRepository;
import com.avyukt.marketsuite.research.repo.InsightRepository;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InsightService {

    private final InsightRepository insightRepository;
    private final InsightEvidenceRepository insightEvidenceRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final CompetitorRepository competitorRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public InsightService(
            InsightRepository insightRepository,
            InsightEvidenceRepository insightEvidenceRepository,
            SourceSnapshotRepository sourceSnapshotRepository,
            CompetitorRepository competitorRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.insightRepository = insightRepository;
        this.insightEvidenceRepository = insightEvidenceRepository;
        this.sourceSnapshotRepository = sourceSnapshotRepository;
        this.competitorRepository = competitorRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Insight> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return insightRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<Insight> listByStatus(UUID workspaceId, InsightStatus status) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return insightRepository.findByWorkspaceIdAndStatus(workspaceId, status);
    }

    @Transactional(readOnly = true)
    public List<Insight> listByCategory(UUID workspaceId, ResearchCategory category) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return insightRepository.findByWorkspaceIdAndCategory(workspaceId, category);
    }

    @Transactional(readOnly = true)
    public List<Insight> listByCompetitor(UUID workspaceId, UUID competitorId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return insightRepository.findByWorkspaceIdAndCompetitorId(workspaceId, competitorId);
    }

    @Transactional(readOnly = true)
    public Insight get(UUID workspaceId, UUID insightId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        assertWorkspaceMatch(insight, workspaceId);
        return insight;
    }

    public Insight create(
            UUID workspaceId,
            ResearchCategory category,
            InsightType insightType,
            String title,
            String summary,
            String detailsJson,
            ConfidenceLevel confidence,
            UUID competitorId,
            String relatedKeywordsJson,
            String relatedTopicsJson,
            String language) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        var competitor =
                competitorId != null ? competitorRepository.getReferenceById(competitorId) : null;
        Insight insight = Insight.builder()
                .workspace(ws)
                .category(category)
                .insightType(insightType)
                .title(title)
                .summary(summary)
                .detailsJson(detailsJson != null ? detailsJson : "{}")
                .confidence(confidence != null ? confidence : ConfidenceLevel.MEDIUM)
                .status(InsightStatus.DRAFT)
                .competitor(competitor)
                .relatedKeywords(relatedKeywordsJson != null ? relatedKeywordsJson : "[]")
                .relatedTopics(relatedTopicsJson != null ? relatedTopicsJson : "[]")
                .language(language != null ? language : "en")
                .createdByUser(user)
                .build();
        Insight saved = insightRepository.save(insight);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "INSIGHT_CREATE",
                "Insight",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public Insight update(
            UUID workspaceId,
            UUID insightId,
            String title,
            String summary,
            String detailsJson,
            String confidence,
            String relatedKeywordsJson,
            String relatedTopicsJson,
            String language,
            String status) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        assertWorkspaceMatch(insight, workspaceId);
        String before = toJson(insight);
        UUID actor = SecurityUtils.currentUserId();
        if (title != null) {
            insight.setTitle(title);
        }
        if (summary != null) {
            insight.setSummary(summary);
        }
        if (detailsJson != null) {
            insight.setDetailsJson(detailsJson);
        }
        if (confidence != null) {
            insight.setConfidence(ConfidenceLevel.valueOf(confidence));
        }
        if (relatedKeywordsJson != null) {
            insight.setRelatedKeywords(relatedKeywordsJson);
        }
        if (relatedTopicsJson != null) {
            insight.setRelatedTopics(relatedTopicsJson);
        }
        if (language != null) {
            insight.setLanguage(language);
        }
        if (status != null) {
            insight.setStatus(InsightStatus.valueOf(status));
        }
        Insight saved = insightRepository.save(insight);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "INSIGHT_UPDATE",
                "Insight",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public Insight publish(UUID workspaceId, UUID insightId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchPublish(orgId, workspaceId);
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        assertWorkspaceMatch(insight, workspaceId);
        long evidenceCount = insightEvidenceRepository.countByInsightId(insightId);
        if (evidenceCount < 1) {
            throw new BusinessException("Insight must have at least one evidence item to publish");
        }
        String before = toJson(insight);
        UUID actor = SecurityUtils.currentUserId();
        insight.setStatus(InsightStatus.PUBLISHED);
        Insight saved = insightRepository.save(insight);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "INSIGHT_PUBLISH",
                "Insight",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public Insight archive(UUID workspaceId, UUID insightId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        assertWorkspaceMatch(insight, workspaceId);
        String before = toJson(insight);
        UUID actor = SecurityUtils.currentUserId();
        insight.setStatus(InsightStatus.ARCHIVED);
        Insight saved = insightRepository.save(insight);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "INSIGHT_ARCHIVE",
                "Insight",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID insightId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        assertWorkspaceMatch(insight, workspaceId);
        String before = toJson(insight);
        UUID actor = SecurityUtils.currentUserId();
        insightEvidenceRepository.deleteAll(insightEvidenceRepository.findByInsightId(insightId));
        insightRepository.delete(insight);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "INSIGHT_DELETE",
                "Insight",
                insightId,
                before,
                null);
    }

    public InsightEvidence addEvidence(
            UUID insightId,
            UUID snapshotId,
            String citationText,
            String citationUrl,
            String evidenceJson) {
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        var snapshot = sourceSnapshotRepository
                .findById(snapshotId)
                .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", snapshotId));
        if (!insight.getWorkspace().getId().equals(snapshot.getWorkspace().getId())) {
            throw new BusinessException("Insight and snapshot must belong to the same workspace");
        }
        UUID workspaceId = insight.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        InsightEvidence ev = InsightEvidence.builder()
                .insight(insight)
                .snapshot(snapshot)
                .citationText(citationText)
                .citationUrl(citationUrl)
                .evidenceJson(evidenceJson != null ? evidenceJson : "{}")
                .build();
        InsightEvidence saved = insightEvidenceRepository.save(ev);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "EVIDENCE_CREATE",
                "InsightEvidence",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public void removeEvidence(UUID evidenceId) {
        InsightEvidence ev = insightEvidenceRepository
                .findById(evidenceId)
                .orElseThrow(() -> new ResourceNotFoundException("InsightEvidence", "id", evidenceId));
        Insight insight = ev.getInsight();
        UUID workspaceId = insight.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        String before = toJson(ev);
        UUID actor = SecurityUtils.currentUserId();
        insightEvidenceRepository.delete(ev);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "EVIDENCE_DELETE",
                "InsightEvidence",
                evidenceId,
                before,
                null);
    }

    @Transactional(readOnly = true)
    public List<InsightEvidence> listEvidence(UUID insightId) {
        Insight insight = insightRepository
                .findById(insightId)
                .orElseThrow(() -> new ResourceNotFoundException("Insight", "id", insightId));
        UUID workspaceId = insight.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return insightEvidenceRepository.findByInsightId(insightId);
    }

    private void assertWorkspaceMatch(Insight insight, UUID workspaceId) {
        if (!insight.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("Insight", "id", insight.getId());
        }
    }

    private String toJson(Object obj) {
        try {
            if (obj instanceof Insight i) {
                var map = new java.util.LinkedHashMap<String, Object>();
                map.put("id", i.getId());
                map.put("title", i.getTitle());
                map.put("category", i.getCategory() != null ? i.getCategory().name() : null);
                map.put("insightType", i.getInsightType() != null ? i.getInsightType().name() : null);
                map.put("status", i.getStatus() != null ? i.getStatus().name() : null);
                map.put("confidence", i.getConfidence() != null ? i.getConfidence().name() : null);
                return objectMapper.writeValueAsString(map);
            }
            if (obj instanceof InsightEvidence e) {
                var map = new java.util.LinkedHashMap<String, Object>();
                map.put("id", e.getId());
                map.put("insightId", e.getInsight() != null ? e.getInsight().getId() : null);
                map.put("snapshotId", e.getSnapshot() != null ? e.getSnapshot().getId() : null);
                return objectMapper.writeValueAsString(map);
            }
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
