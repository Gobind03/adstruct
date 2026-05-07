package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.repo.IntegrationResourceRepository;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.Competitor;
import com.avyukt.marketsuite.research.domain.ResearchSource;
import com.avyukt.marketsuite.research.domain.SourceType;
import com.avyukt.marketsuite.research.repo.CompetitorRepository;
import com.avyukt.marketsuite.research.repo.ResearchSourceRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResearchSourceService {

    private final ResearchSourceRepository researchSourceRepository;
    private final CompetitorRepository competitorRepository;
    private final IntegrationAccountRepository integrationAccountRepository;
    private final IntegrationResourceRepository integrationResourceRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ResearchSourceService(
            ResearchSourceRepository researchSourceRepository,
            CompetitorRepository competitorRepository,
            IntegrationAccountRepository integrationAccountRepository,
            IntegrationResourceRepository integrationResourceRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.researchSourceRepository = researchSourceRepository;
        this.competitorRepository = competitorRepository;
        this.integrationAccountRepository = integrationAccountRepository;
        this.integrationResourceRepository = integrationResourceRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ResearchSource> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return researchSourceRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<ResearchSource> listByType(UUID workspaceId, SourceType type) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return researchSourceRepository.findByWorkspaceIdAndSourceType(workspaceId, type);
    }

    @Transactional(readOnly = true)
    public ResearchSource get(UUID workspaceId, UUID sourceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        ResearchSource s = researchSourceRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSource", "id", sourceId));
        assertWorkspaceMatch(s, workspaceId);
        return s;
    }

    public ResearchSource create(
            UUID workspaceId,
            SourceType sourceType,
            String title,
            String url,
            UUID competitorId,
            UUID integrationAccountId,
            UUID integrationResourceId,
            String fileUrl,
            String noteText,
            String metaJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        Competitor competitor =
                competitorId != null ? competitorRepository.getReferenceById(competitorId) : null;
        var account = integrationAccountId != null
                ? integrationAccountRepository.getReferenceById(integrationAccountId)
                : null;
        var resource = integrationResourceId != null
                ? integrationResourceRepository.getReferenceById(integrationResourceId)
                : null;
        ResearchSource s = ResearchSource.builder()
                .workspace(ws)
                .sourceType(sourceType)
                .title(title)
                .url(url)
                .competitor(competitor)
                .integrationAccount(account)
                .integrationResource(resource)
                .fileUrl(fileUrl)
                .noteText(noteText)
                .metaJson(metaJson != null ? metaJson : "{}")
                .createdByUser(user)
                .build();
        ResearchSource saved = researchSourceRepository.save(s);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SOURCE_CREATE",
                "ResearchSource",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public ResearchSource update(
            UUID workspaceId,
            UUID sourceId,
            String title,
            String url,
            UUID competitorId,
            String noteText,
            String metaJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        ResearchSource s = researchSourceRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSource", "id", sourceId));
        assertWorkspaceMatch(s, workspaceId);
        String before = toJson(s);
        UUID actor = SecurityUtils.currentUserId();
        s.setTitle(title);
        s.setUrl(url);
        if (competitorId != null) {
            s.setCompetitor(competitorRepository.getReferenceById(competitorId));
        } else {
            s.setCompetitor(null);
        }
        s.setNoteText(noteText);
        if (metaJson != null) {
            s.setMetaJson(metaJson);
        }
        ResearchSource saved = researchSourceRepository.save(s);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SOURCE_UPDATE",
                "ResearchSource",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID sourceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        ResearchSource s = researchSourceRepository
                .findById(sourceId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchSource", "id", sourceId));
        assertWorkspaceMatch(s, workspaceId);
        String before = toJson(s);
        UUID actor = SecurityUtils.currentUserId();
        researchSourceRepository.delete(s);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "SOURCE_DELETE",
                "ResearchSource",
                sourceId,
                before,
                null);
    }

    private void assertWorkspaceMatch(ResearchSource s, UUID workspaceId) {
        if (!s.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("ResearchSource", "id", s.getId());
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
