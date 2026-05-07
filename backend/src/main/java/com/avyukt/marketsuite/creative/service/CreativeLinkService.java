package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeLinkRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeLinkResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeLink;
import com.avyukt.marketsuite.creative.repo.CreativeLinkRepository;
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
public class CreativeLinkService {

    private static final Logger log = LoggerFactory.getLogger(CreativeLinkService.class);

    private final CreativeLinkRepository linkRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final CreativeMapper creativeMapper;
    private final ObjectMapper objectMapper;

    public CreativeLinkService(
            CreativeLinkRepository linkRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            CreativeMapper creativeMapper,
            ObjectMapper objectMapper) {
        this.linkRepository = linkRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.creativeMapper = creativeMapper;
        this.objectMapper = objectMapper;
    }

    public CreativeLinkResponse create(UUID workspaceId, CreativeLinkRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeLink link =
                CreativeLink.builder()
                        .workspace(ws)
                        .fromEntityType(request.fromEntityType())
                        .fromEntityId(request.fromEntityId())
                        .toEntityType(request.toEntityType())
                        .toEntityId(request.toEntityId())
                        .relationType(request.relationType())
                        .note(request.note())
                        .createdByUser(user)
                        .build();

        CreativeLink saved = linkRepository.save(link);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_CREATIVE_LINK",
                "CreativeLink",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toLinkResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CreativeLinkResponse> listAll(UUID workspaceId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return linkRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(creativeMapper::toLinkResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CreativeLinkResponse> listFrom(
            UUID workspaceId, String fromEntityType, UUID fromEntityId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return linkRepository
                .findByWorkspaceIdAndFromEntityTypeAndFromEntityId(
                        workspaceId, fromEntityType, fromEntityId)
                .stream()
                .map(creativeMapper::toLinkResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CreativeLinkResponse> listTo(
            UUID workspaceId, String toEntityType, UUID toEntityId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return linkRepository
                .findByWorkspaceIdAndToEntityTypeAndToEntityId(workspaceId, toEntityType, toEntityId)
                .stream()
                .map(creativeMapper::toLinkResponse)
                .toList();
    }

    public void delete(UUID workspaceId, UUID linkId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();

        CreativeLink link =
                linkRepository
                        .findById(linkId)
                        .orElseThrow(() -> new ResourceNotFoundException("CreativeLink", "id", linkId));
        assertLinkWorkspace(link, workspaceId);
        String before = toJson(link);
        linkRepository.delete(link);
        auditService.log(
                orgId, workspaceId, actor, "DELETE_CREATIVE_LINK", "CreativeLink", linkId, before, null);
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private void assertLinkWorkspace(CreativeLink link, UUID workspaceId) {
        if (!link.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeLink", "id", link.getId());
        }
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
