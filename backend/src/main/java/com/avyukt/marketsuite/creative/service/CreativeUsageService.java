package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeUsageRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeUsageResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeUsage;
import com.avyukt.marketsuite.creative.repo.CreativeUsageRepository;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CreativeUsageService {

    private static final Logger log = LoggerFactory.getLogger(CreativeUsageService.class);

    private final CreativeUsageRepository usageRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final CreativeMapper creativeMapper;
    private final ObjectMapper objectMapper;

    public CreativeUsageService(
            CreativeUsageRepository usageRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            CreativeMapper creativeMapper,
            ObjectMapper objectMapper) {
        this.usageRepository = usageRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.creativeMapper = creativeMapper;
        this.objectMapper = objectMapper;
    }

    public CreativeUsageResponse create(UUID workspaceId, CreativeUsageRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeUsage usage =
                CreativeUsage.builder()
                        .workspace(ws)
                        .usedEntityType(request.usedEntityType())
                        .usedEntityId(request.usedEntityId())
                        .creativeEntityType(request.creativeEntityType())
                        .creativeEntityId(request.creativeEntityId())
                        .relationType(
                                request.relationType() != null && !request.relationType().isBlank()
                                        ? request.relationType()
                                        : "USES")
                        .contextJson(request.contextJson() != null ? request.contextJson() : "{}")
                        .createdByUser(user)
                        .build();

        CreativeUsage saved = usageRepository.save(usage);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_CREATIVE_USAGE",
                "CreativeUsage",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toUsageResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CreativeUsageResponse> listAll(UUID workspaceId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return usageRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(creativeMapper::toUsageResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CreativeUsageResponse> listByCreative(
            UUID workspaceId, String creativeEntityType, UUID creativeEntityId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return usageRepository
                .findByWorkspaceIdAndCreativeEntityTypeAndCreativeEntityId(
                        workspaceId, creativeEntityType, creativeEntityId)
                .stream()
                .map(creativeMapper::toUsageResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CreativeUsageResponse> listByUsedEntity(
            UUID workspaceId, String usedEntityType, UUID usedEntityId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return usageRepository
                .findByWorkspaceIdAndUsedEntityTypeAndUsedEntityId(
                        workspaceId, usedEntityType, usedEntityId)
                .stream()
                .map(creativeMapper::toUsageResponse)
                .toList();
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize entity for audit", e);
            return null;
        }
    }
}
