package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.JobType;
import com.avyukt.marketsuite.research.domain.RefreshFrequency;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import com.avyukt.marketsuite.research.domain.Watchlist;
import com.avyukt.marketsuite.research.domain.WatchlistType;
import com.avyukt.marketsuite.research.repo.CompetitorRepository;
import com.avyukt.marketsuite.research.repo.WatchlistRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final CompetitorRepository competitorRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ResearchJobService researchJobService;
    private final ObjectMapper objectMapper;

    public WatchlistService(
            WatchlistRepository watchlistRepository,
            CompetitorRepository competitorRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ResearchJobService researchJobService,
            ObjectMapper objectMapper) {
        this.watchlistRepository = watchlistRepository;
        this.competitorRepository = competitorRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.researchJobService = researchJobService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Watchlist> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return watchlistRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public Watchlist get(UUID workspaceId, UUID watchlistId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        Watchlist w = watchlistRepository
                .findById(watchlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", "id", watchlistId));
        assertWorkspaceMatch(w, workspaceId);
        return w;
    }

    public Watchlist create(
            UUID workspaceId,
            WatchlistType type,
            String name,
            UUID competitorId,
            String queryJson,
            RefreshFrequency frequency) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        var competitor =
                competitorId != null ? competitorRepository.getReferenceById(competitorId) : null;
        Watchlist w = Watchlist.builder()
                .workspace(ws)
                .watchlistType(type)
                .name(name)
                .competitor(competitor)
                .queryJson(queryJson != null ? queryJson : "{}")
                .frequency(frequency != null ? frequency : RefreshFrequency.MANUAL)
                .enabled(true)
                .createdByUser(user)
                .build();
        Watchlist saved = watchlistRepository.save(w);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "WATCHLIST_CREATE",
                "Watchlist",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public Watchlist update(
            UUID workspaceId,
            UUID watchlistId,
            String name,
            String queryJson,
            String frequency,
            Boolean enabled) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        Watchlist w = watchlistRepository
                .findById(watchlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", "id", watchlistId));
        assertWorkspaceMatch(w, workspaceId);
        String before = toJson(w);
        UUID actor = SecurityUtils.currentUserId();
        if (name != null) {
            w.setName(name);
        }
        if (queryJson != null) {
            w.setQueryJson(queryJson);
        }
        if (frequency != null) {
            w.setFrequency(RefreshFrequency.valueOf(frequency));
        }
        if (enabled != null) {
            w.setEnabled(enabled);
        }
        Watchlist saved = watchlistRepository.save(w);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "WATCHLIST_UPDATE",
                "Watchlist",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID watchlistId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        Watchlist w = watchlistRepository
                .findById(watchlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", "id", watchlistId));
        assertWorkspaceMatch(w, workspaceId);
        String before = toJson(w);
        UUID actor = SecurityUtils.currentUserId();
        watchlistRepository.delete(w);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "WATCHLIST_DELETE",
                "Watchlist",
                watchlistId,
                before,
                null);
    }

    public ResearchJob refresh(UUID workspaceId, UUID watchlistId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        Watchlist w = watchlistRepository
                .findById(watchlistId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", "id", watchlistId));
        assertWorkspaceMatch(w, workspaceId);
        String before = toJson(w);
        UUID actor = SecurityUtils.currentUserId();
        w.setLastRefreshedAt(OffsetDateTime.now());
        Watchlist saved = watchlistRepository.save(w);
        Map<String, Object> input = new HashMap<>();
        input.put("watchlistId", watchlistId.toString());
        String inputJson;
        try {
            inputJson = objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            inputJson = "{}";
        }
        ResearchJob job = researchJobService.createJob(workspaceId, JobType.REFRESH_WATCHLIST, inputJson);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "WATCHLIST_REFRESH",
                "Watchlist",
                saved.getId(),
                before,
                toJson(saved));
        return job;
    }

    private void assertWorkspaceMatch(Watchlist w, UUID workspaceId) {
        if (!w.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("Watchlist", "id", w.getId());
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
