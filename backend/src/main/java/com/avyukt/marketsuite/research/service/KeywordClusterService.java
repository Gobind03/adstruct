package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.KeywordCluster;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.repo.KeywordClusterRepository;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class KeywordClusterService {

    private final KeywordClusterRepository keywordClusterRepository;
    private final SourceSnapshotRepository sourceSnapshotRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public KeywordClusterService(
            KeywordClusterRepository keywordClusterRepository,
            SourceSnapshotRepository sourceSnapshotRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.keywordClusterRepository = keywordClusterRepository;
        this.sourceSnapshotRepository = sourceSnapshotRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<KeywordCluster> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return keywordClusterRepository.findByWorkspaceId(workspaceId);
    }

    @Transactional(readOnly = true)
    public KeywordCluster get(UUID workspaceId, UUID clusterId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        KeywordCluster k = keywordClusterRepository
                .findById(clusterId)
                .orElseThrow(() -> new ResourceNotFoundException("KeywordCluster", "id", clusterId));
        assertWorkspaceMatch(k, workspaceId);
        return k;
    }

    public KeywordCluster create(
            UUID workspaceId,
            String name,
            String intentType,
            String keywordsJson,
            String metricsJson,
            UUID sourceSnapshotId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        SourceSnapshot snap =
                sourceSnapshotId != null ? sourceSnapshotRepository.getReferenceById(sourceSnapshotId) : null;
        KeywordCluster k = KeywordCluster.builder()
                .workspace(ws)
                .name(name)
                .intentType(intentType)
                .keywords(keywordsJson != null ? keywordsJson : "[]")
                .metricsJson(metricsJson != null ? metricsJson : "{}")
                .sourceSnapshot(snap)
                .createdByUser(user)
                .build();
        KeywordCluster saved = keywordClusterRepository.save(k);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "KEYWORD_CLUSTER_CREATE",
                "KeywordCluster",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public KeywordCluster update(
            UUID workspaceId,
            UUID clusterId,
            String name,
            String intentType,
            String keywordsJson,
            String metricsJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        KeywordCluster k = keywordClusterRepository
                .findById(clusterId)
                .orElseThrow(() -> new ResourceNotFoundException("KeywordCluster", "id", clusterId));
        assertWorkspaceMatch(k, workspaceId);
        String before = toJson(k);
        UUID actor = SecurityUtils.currentUserId();
        if (name != null) {
            k.setName(name);
        }
        if (intentType != null) {
            k.setIntentType(intentType);
        }
        if (keywordsJson != null) {
            k.setKeywords(keywordsJson);
        }
        if (metricsJson != null) {
            k.setMetricsJson(metricsJson);
        }
        KeywordCluster saved = keywordClusterRepository.save(k);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "KEYWORD_CLUSTER_UPDATE",
                "KeywordCluster",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID clusterId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        KeywordCluster k = keywordClusterRepository
                .findById(clusterId)
                .orElseThrow(() -> new ResourceNotFoundException("KeywordCluster", "id", clusterId));
        assertWorkspaceMatch(k, workspaceId);
        String before = toJson(k);
        UUID actor = SecurityUtils.currentUserId();
        keywordClusterRepository.delete(k);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "KEYWORD_CLUSTER_DELETE",
                "KeywordCluster",
                clusterId,
                before,
                null);
    }

    private void assertWorkspaceMatch(KeywordCluster k, UUID workspaceId) {
        if (!k.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("KeywordCluster", "id", k.getId());
        }
    }

    private String toJson(Object obj) {
        try {
            if (obj instanceof KeywordCluster k) {
                var map = new java.util.LinkedHashMap<String, Object>();
                map.put("id", k.getId());
                map.put("name", k.getName());
                map.put("intentType", k.getIntentType());
                map.put("sourceSnapshotId", k.getSourceSnapshot() != null ? k.getSourceSnapshot().getId() : null);
                return objectMapper.writeValueAsString(map);
            }
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
