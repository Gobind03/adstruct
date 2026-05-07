package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.research.domain.Competitor;
import com.avyukt.marketsuite.research.domain.CompetitorExternalHandle;
import com.avyukt.marketsuite.research.domain.CompetitorStatus;
import com.avyukt.marketsuite.research.repo.CompetitorExternalHandleRepository;
import com.avyukt.marketsuite.research.repo.CompetitorRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CompetitorService {

    private final CompetitorRepository competitorRepository;
    private final CompetitorExternalHandleRepository handleRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public CompetitorService(
            CompetitorRepository competitorRepository,
            CompetitorExternalHandleRepository handleRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.competitorRepository = competitorRepository;
        this.handleRepository = handleRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Competitor> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return competitorRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public List<Competitor> listByStatus(UUID workspaceId, CompetitorStatus status) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return competitorRepository.findByWorkspaceIdAndStatus(workspaceId, status);
    }

    @Transactional(readOnly = true)
    public Competitor get(UUID workspaceId, UUID competitorId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        Competitor c = competitorRepository
                .findById(competitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Competitor", "id", competitorId));
        assertWorkspaceMatch(c, workspaceId);
        return c;
    }

    public Competitor create(
            UUID workspaceId,
            String name,
            String websiteUrl,
            String description,
            String categoryTagsJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        Competitor c = Competitor.builder()
                .workspace(ws)
                .name(name)
                .websiteUrl(websiteUrl)
                .description(description)
                .categoryTags(categoryTagsJson != null ? categoryTagsJson : "[]")
                .status(CompetitorStatus.ACTIVE)
                .createdByUser(user)
                .build();
        Competitor saved = competitorRepository.save(c);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "COMPETITOR_CREATE",
                "Competitor",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public Competitor update(
            UUID workspaceId,
            UUID competitorId,
            String name,
            String websiteUrl,
            String description,
            String categoryTagsJson,
            String status) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        Competitor c = competitorRepository
                .findById(competitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Competitor", "id", competitorId));
        assertWorkspaceMatch(c, workspaceId);
        String before = toJson(c);
        UUID actor = SecurityUtils.currentUserId();
        c.setName(name);
        c.setWebsiteUrl(websiteUrl);
        c.setDescription(description);
        if (categoryTagsJson != null) {
            c.setCategoryTags(categoryTagsJson);
        }
        if (status != null) {
            c.setStatus(CompetitorStatus.valueOf(status));
        }
        Competitor saved = competitorRepository.save(c);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "COMPETITOR_UPDATE",
                "Competitor",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID competitorId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        Competitor c = competitorRepository
                .findById(competitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Competitor", "id", competitorId));
        assertWorkspaceMatch(c, workspaceId);
        String before = toJson(c);
        UUID actor = SecurityUtils.currentUserId();
        competitorRepository.delete(c);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "COMPETITOR_DELETE",
                "Competitor",
                competitorId,
                before,
                null);
    }

    public CompetitorExternalHandle addHandle(
            UUID competitorId, String platformType, String handle, String url) {
        Competitor c = competitorRepository
                .findById(competitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Competitor", "id", competitorId));
        UUID workspaceId = c.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        CompetitorExternalHandle h = CompetitorExternalHandle.builder()
                .competitor(c)
                .platformType(platformType)
                .handle(handle)
                .url(url)
                .build();
        CompetitorExternalHandle saved = handleRepository.save(h);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "COMPETITOR_HANDLE_ADD",
                "CompetitorExternalHandle",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public void removeHandle(UUID handleId) {
        CompetitorExternalHandle h = handleRepository
                .findById(handleId)
                .orElseThrow(() -> new ResourceNotFoundException("CompetitorExternalHandle", "id", handleId));
        Competitor c = h.getCompetitor();
        UUID workspaceId = c.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        String before = toJson(h);
        UUID actor = SecurityUtils.currentUserId();
        handleRepository.delete(h);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "COMPETITOR_HANDLE_REMOVE",
                "CompetitorExternalHandle",
                handleId,
                before,
                null);
    }

    @Transactional(readOnly = true)
    public List<CompetitorExternalHandle> listHandles(UUID competitorId) {
        Competitor c = competitorRepository
                .findById(competitorId)
                .orElseThrow(() -> new ResourceNotFoundException("Competitor", "id", competitorId));
        UUID workspaceId = c.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return handleRepository.findByCompetitorId(competitorId);
    }

    private void assertWorkspaceMatch(Competitor c, UUID workspaceId) {
        if (!c.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("Competitor", "id", c.getId());
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
