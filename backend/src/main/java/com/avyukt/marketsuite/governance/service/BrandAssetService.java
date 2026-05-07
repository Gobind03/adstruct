package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.BrandAssetCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandAssetPatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandAssetResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.BrandAsset;
import com.avyukt.marketsuite.governance.domain.BrandProfileScope;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import com.avyukt.marketsuite.governance.repo.BrandAssetRepository;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BrandAssetService {

    private final BrandAssetRepository repository;
    private final OrganizationRepository orgRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public BrandAssetService(
            BrandAssetRepository repository,
            OrganizationRepository orgRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.orgRepository = orgRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<BrandAssetResponse> list(UUID orgId, UUID workspaceId, BrandStatus status) {
        permissionService.requireOrgAccess(orgId);
        return repository.findFiltered(orgId, workspaceId, status).stream()
                .map(mapper::toBrandAssetResponse)
                .toList();
    }

    public BrandAssetResponse create(UUID orgId, BrandAssetCreateRequest req) {
        BrandProfileScope scope = BrandProfileScope.valueOf(req.scope());
        UUID workspaceId = req.workspaceId() != null ? UUID.fromString(req.workspaceId()) : null;
        if (scope == BrandProfileScope.WORKSPACE && workspaceId == null) {
            throw new BusinessException("workspaceId is required for WORKSPACE-scoped assets");
        }
        if (scope == BrandProfileScope.ORG) {
            permissionService.requireBrandOrgManagement(orgId);
        } else {
            permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        }
        BrandAsset asset = BrandAsset.builder()
                .scope(scope)
                .org(orgRepository.getReferenceById(orgId))
                .workspace(workspaceId != null ? workspaceRepository.getReferenceById(workspaceId) : null)
                .name(req.name())
                .assetType(req.assetType())
                .fileUrl(req.fileUrl())
                .checksum(req.checksum())
                .width(req.width())
                .height(req.height())
                .mimeType(req.mimeType())
                .tags(req.tags() != null ? req.tags() : "[]")
                .build();
        BrandAsset saved = repository.save(asset);
        auditService.log(orgId, workspaceId, SecurityUtils.currentUserId(), "CREATE", "BRAND_ASSET", saved.getId(), null, toJson(saved));
        return mapper.toBrandAssetResponse(saved);
    }

    public BrandAssetResponse patch(UUID orgId, UUID assetId, BrandAssetPatchRequest req) {
        BrandAsset asset = repository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandAsset", "id", assetId));
        permissionService.requireOrgAccess(orgId);
        String before = toJson(asset);
        if (req.name() != null) asset.setName(req.name());
        if (req.assetType() != null) asset.setAssetType(req.assetType());
        if (req.tags() != null) asset.setTags(req.tags());
        if (req.status() != null) asset.setStatus(BrandStatus.valueOf(req.status()));
        BrandAsset saved = repository.save(asset);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE", "BRAND_ASSET", saved.getId(), before, toJson(saved));
        return mapper.toBrandAssetResponse(saved);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
