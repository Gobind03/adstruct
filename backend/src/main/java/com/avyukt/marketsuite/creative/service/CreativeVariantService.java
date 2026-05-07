package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.VariantCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.VariantResponse;
import com.avyukt.marketsuite.creative.api.dto.VariantSetCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.VariantSetResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeVariant;
import com.avyukt.marketsuite.creative.domain.CreativeVariantSet;
import com.avyukt.marketsuite.creative.repo.CreativeVariantRepository;
import com.avyukt.marketsuite.creative.repo.CreativeVariantSetRepository;
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
public class CreativeVariantService {

    private static final Logger log = LoggerFactory.getLogger(CreativeVariantService.class);

    private final CreativeVariantSetRepository variantSetRepository;
    private final CreativeVariantRepository variantRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final CreativeMapper creativeMapper;
    private final ObjectMapper objectMapper;

    public CreativeVariantService(
            CreativeVariantSetRepository variantSetRepository,
            CreativeVariantRepository variantRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            CreativeMapper creativeMapper,
            ObjectMapper objectMapper) {
        this.variantSetRepository = variantSetRepository;
        this.variantRepository = variantRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.creativeMapper = creativeMapper;
        this.objectMapper = objectMapper;
    }

    public VariantSetResponse createSet(UUID workspaceId, VariantSetCreateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeVariantSet set = CreativeVariantSet.builder()
                .workspace(ws)
                .name(request.name())
                .parentEntityType(request.parentEntityType())
                .parentEntityId(request.parentEntityId())
                .strategy(request.strategy())
                .parametersJson(request.parametersJson() != null ? request.parametersJson() : "{}")
                .createdByUser(user)
                .build();

        CreativeVariantSet saved = variantSetRepository.save(set);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_VARIANT_SET",
                "CreativeVariantSet",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toVariantSetResponse(saved);
    }

    public VariantResponse addVariant(UUID workspaceId, UUID variantSetId, VariantCreateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();

        CreativeVariantSet set = variantSetRepository
                .findById(variantSetId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeVariantSet", "id", variantSetId));
        assertSetWorkspace(set, workspaceId);

        int nextIndex =
                variantRepository.findByVariantSetIdOrderByVariantIndexAsc(variantSetId).stream()
                        .mapToInt(CreativeVariant::getVariantIndex)
                        .max()
                        .orElse(-1)
                        + 1;

        CreativeVariant variant = CreativeVariant.builder()
                .variantSet(set)
                .variantIndex(nextIndex)
                .entityType(request.entityType())
                .entityId(request.entityId())
                .notes(request.notes())
                .build();

        CreativeVariant saved = variantRepository.save(variant);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_VARIANT",
                "CreativeVariant",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toVariantResponse(saved);
    }

    @Transactional(readOnly = true)
    public VariantSetResponse getSet(UUID workspaceId, UUID variantSetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        CreativeVariantSet set = variantSetRepository
                .findById(variantSetId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeVariantSet", "id", variantSetId));
        assertSetWorkspace(set, workspaceId);
        return creativeMapper.toVariantSetResponse(set);
    }

    @Transactional(readOnly = true)
    public List<VariantSetResponse> listSets(
            UUID workspaceId, String parentEntityType, UUID parentEntityId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        boolean hasType = parentEntityType != null && !parentEntityType.isBlank();
        boolean hasId = parentEntityId != null;
        if (hasType != hasId) {
            throw new BusinessException("parentEntityType and parentEntityId must both be set or both omitted");
        }

        List<CreativeVariantSet> sets =
                variantSetRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        if (hasType) {
            sets = sets.stream()
                    .filter(
                            s -> parentEntityType.equals(s.getParentEntityType())
                                    && parentEntityId.equals(s.getParentEntityId()))
                    .toList();
        }
        return sets.stream().map(creativeMapper::toVariantSetResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VariantResponse> listVariants(UUID variantSetId) {
        CreativeVariantSet set = variantSetRepository
                .findById(variantSetId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeVariantSet", "id", variantSetId));
        UUID workspaceId = set.getWorkspace().getId();
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return variantRepository.findByVariantSetIdOrderByVariantIndexAsc(variantSetId).stream()
                .map(creativeMapper::toVariantResponse)
                .toList();
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private void assertSetWorkspace(CreativeVariantSet set, UUID workspaceId) {
        if (!set.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeVariantSet", "id", set.getId());
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
