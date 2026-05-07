package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceResponse;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceUpdateRequest;
import com.avyukt.marketsuite.identity.api.mapper.WorkspaceMapper;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.domain.WorkspaceStatus;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final OrganizationRepository organizationRepository;
    private final WorkspaceMapper mapper;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public WorkspaceService(
            WorkspaceRepository workspaceRepository,
            OrganizationRepository organizationRepository,
            WorkspaceMapper mapper,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.workspaceRepository = workspaceRepository;
        this.organizationRepository = organizationRepository;
        this.mapper = mapper;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public WorkspaceResponse create(UUID orgId, WorkspaceCreateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Organization org = organizationRepository
                .findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));

        workspaceRepository.findByOrgIdAndName(orgId, request.name()).ifPresent(existing -> {
            throw new BusinessException(
                    "A workspace named '" + request.name() + "' already exists in this organization");
        });

        Workspace workspace = mapper.toEntity(request);
        workspace.setOrg(org);
        Workspace saved = workspaceRepository.save(workspace);

        auditService.log(orgId, saved.getId(), actorId, "CREATE", "WORKSPACE", saved.getId(), null, toJson(saved));
        return mapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<WorkspaceResponse> findByOrgId(UUID orgId, String status, String nameFilter) {
        if (status != null && !status.isEmpty()) {
            return workspaceRepository.findByOrgIdAndStatus(orgId, WorkspaceStatus.valueOf(status)).stream()
                    .map(mapper::toResponse)
                    .toList();
        }
        if (nameFilter != null && !nameFilter.isEmpty()) {
            return workspaceRepository.findByOrgIdAndNameContainingIgnoreCase(orgId, nameFilter).stream()
                    .map(mapper::toResponse)
                    .toList();
        }
        return workspaceRepository.findByOrgId(orgId).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkspaceResponse findById(UUID id) {
        Workspace ws = workspaceRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", id));
        return mapper.toResponse(ws);
    }

    public WorkspaceResponse update(UUID orgId, UUID wsId, WorkspaceUpdateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Workspace ws = workspaceRepository
                .findById(wsId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", wsId));
        String beforeJson = toJson(ws);

        if (request.name() != null) {
            workspaceRepository
                    .findByOrgIdAndName(orgId, request.name())
                    .filter(existing -> !existing.getId().equals(wsId))
                    .ifPresent(existing -> {
                        throw new BusinessException(
                                "A workspace named '" + request.name() + "' already exists in this organization");
                    });
            ws.setName(request.name());
        }
        if (request.market() != null) ws.setMarket(request.market());

        Workspace saved = workspaceRepository.save(ws);
        auditService.log(orgId, wsId, actorId, "UPDATE", "WORKSPACE", wsId, beforeJson, toJson(saved));
        return mapper.toResponse(saved);
    }

    public WorkspaceResponse archive(UUID orgId, UUID wsId) {
        return setStatus(orgId, wsId, WorkspaceStatus.ARCHIVED, "ARCHIVE");
    }

    public WorkspaceResponse restore(UUID orgId, UUID wsId) {
        return setStatus(orgId, wsId, WorkspaceStatus.ACTIVE, "RESTORE");
    }

    private WorkspaceResponse setStatus(UUID orgId, UUID wsId, WorkspaceStatus status, String action) {
        UUID actorId = SecurityUtils.currentUserId();
        Workspace ws = workspaceRepository
                .findById(wsId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", wsId));
        String beforeJson = toJson(ws);
        ws.setStatus(status);
        Workspace saved = workspaceRepository.save(ws);
        auditService.log(orgId, wsId, actorId, action, "WORKSPACE", wsId, beforeJson, toJson(saved));
        return mapper.toResponse(saved);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
