package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.research.domain.LinkedEntityType;
import com.avyukt.marketsuite.research.domain.RelationType;
import com.avyukt.marketsuite.research.domain.ResearchEntityType;
import com.avyukt.marketsuite.research.domain.ResearchLink;
import com.avyukt.marketsuite.research.repo.ResearchLinkRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResearchLinkService {

    private final ResearchLinkRepository researchLinkRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ResearchLinkService(
            ResearchLinkRepository researchLinkRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.researchLinkRepository = researchLinkRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ResearchLink> list(
            UUID workspaceId,
            ResearchEntityType researchEntityType,
            UUID researchEntityId,
            LinkedEntityType linkedEntityType,
            UUID linkedEntityId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        Stream<ResearchLink> stream = researchLinkRepository.findByWorkspaceId(workspaceId).stream();
        if (researchEntityType != null) {
            stream = stream.filter(l -> l.getResearchEntityType() == researchEntityType);
        }
        if (researchEntityId != null) {
            stream = stream.filter(l -> researchEntityId.equals(l.getResearchEntityId()));
        }
        if (linkedEntityType != null) {
            stream = stream.filter(l -> l.getLinkedEntityType() == linkedEntityType);
        }
        if (linkedEntityId != null) {
            stream = stream.filter(l -> linkedEntityId.equals(l.getLinkedEntityId()));
        }
        return stream.toList();
    }

    public ResearchLink create(
            UUID workspaceId,
            ResearchEntityType researchEntityType,
            UUID researchEntityId,
            LinkedEntityType linkedEntityType,
            UUID linkedEntityId,
            RelationType relationType,
            String note) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        ResearchLink link = ResearchLink.builder()
                .workspace(ws)
                .researchEntityType(researchEntityType)
                .researchEntityId(researchEntityId)
                .linkedEntityType(linkedEntityType)
                .linkedEntityId(linkedEntityId)
                .relationType(relationType)
                .note(note)
                .createdByUser(user)
                .build();
        ResearchLink saved = researchLinkRepository.save(link);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_LINK_CREATE",
                "ResearchLink",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public void delete(UUID workspaceId, UUID linkId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchManagement(orgId, workspaceId);
        ResearchLink link = researchLinkRepository
                .findById(linkId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchLink", "id", linkId));
        if (!link.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("ResearchLink", "id", linkId);
        }
        String before = toJson(link);
        UUID actor = SecurityUtils.currentUserId();
        researchLinkRepository.delete(link);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_LINK_DELETE",
                "ResearchLink",
                linkId,
                before,
                null);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
