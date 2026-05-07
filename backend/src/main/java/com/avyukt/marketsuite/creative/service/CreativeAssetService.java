package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetResponse;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetUpdateRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetVersionRequest;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetVersionResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.AssetStatus;
import com.avyukt.marketsuite.creative.domain.AssetType;
import com.avyukt.marketsuite.creative.domain.AssetVisibility;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import com.avyukt.marketsuite.creative.domain.CreativeAssetVersion;
import com.avyukt.marketsuite.creative.repo.CreativeAssetRepository;
import com.avyukt.marketsuite.creative.repo.CreativeAssetVersionRepository;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CreativeAssetService {

    private static final Logger log = LoggerFactory.getLogger(CreativeAssetService.class);

    private final CreativeAssetRepository assetRepository;
    private final CreativeAssetVersionRepository versionRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final CreativeMapper creativeMapper;
    private final ObjectMapper objectMapper;

    public CreativeAssetService(
            CreativeAssetRepository assetRepository,
            CreativeAssetVersionRepository versionRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            CreativeMapper creativeMapper,
            ObjectMapper objectMapper) {
        this.assetRepository = assetRepository;
        this.versionRepository = versionRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.creativeMapper = creativeMapper;
        this.objectMapper = objectMapper;
    }

    public CreativeAssetResponse create(UUID workspaceId, CreativeAssetCreateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        AssetType assetType = parseAssetType(request.assetType());
        String fileUrl = request.fileUrl() != null ? request.fileUrl() : request.sourceUrl();
        AssetVisibility visibility =
                request.visibility() != null && !request.visibility().isBlank()
                        ? parseVisibility(request.visibility())
                        : AssetVisibility.WORKSPACE;

        CreativeAsset entity = CreativeAsset.builder()
                .workspace(ws)
                .org(ws.getOrg())
                .assetType(assetType)
                .status(AssetStatus.DRAFT)
                .visibility(visibility)
                .name(request.name())
                .description(request.description())
                .sourceType("URL")
                .sourceUrl(request.sourceUrl())
                .fileUrl(fileUrl)
                .mimeType(request.mimeType())
                .width(request.width())
                .height(request.height())
                .durationSeconds(request.durationSeconds())
                .sizeBytes(request.sizeBytes())
                .tags(request.tags() != null ? request.tags() : "[]")
                .metaJson(request.metaJson() != null ? request.metaJson() : "{}")
                .createdByUser(user)
                .updatedByUser(user)
                .build();

        CreativeAsset saved = assetRepository.save(entity);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_CREATIVE_ASSET",
                "CreativeAsset",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toAssetResponse(saved);
    }

    public CreativeAssetResponse update(UUID workspaceId, UUID assetId, CreativeAssetUpdateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeAsset asset =
                assetRepository.findById(assetId).orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertWorkspaceMatch(asset, workspaceId);
        String before = toJson(asset);

        if (request.name() != null) {
            asset.setName(request.name());
        }
        if (request.description() != null) {
            asset.setDescription(request.description());
        }
        if (request.visibility() != null && !request.visibility().isBlank()) {
            asset.setVisibility(parseVisibility(request.visibility()));
        }
        if (request.tags() != null) {
            asset.setTags(request.tags());
        }
        if (request.metaJson() != null) {
            asset.setMetaJson(request.metaJson());
        }
        if (request.status() != null && !request.status().isBlank()) {
            asset.setStatus(parseAssetStatus(request.status()));
        }
        asset.setUpdatedByUser(user);

        CreativeAsset saved = assetRepository.save(asset);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "UPDATE_CREATIVE_ASSET",
                "CreativeAsset",
                saved.getId(),
                before,
                toJson(saved));
        return creativeMapper.toAssetResponse(saved);
    }

    public CreativeAssetResponse archive(UUID workspaceId, UUID assetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeAsset asset =
                assetRepository.findById(assetId).orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertWorkspaceMatch(asset, workspaceId);
        String before = toJson(asset);
        asset.setStatus(AssetStatus.ARCHIVED);
        asset.setUpdatedByUser(user);
        CreativeAsset saved = assetRepository.save(asset);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "ARCHIVE_CREATIVE_ASSET",
                "CreativeAsset",
                saved.getId(),
                before,
                toJson(saved));
        return creativeMapper.toAssetResponse(saved);
    }

    @Transactional(readOnly = true)
    public CreativeAssetResponse get(UUID workspaceId, UUID assetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        CreativeAsset asset =
                assetRepository.findById(assetId).orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertWorkspaceMatch(asset, workspaceId);
        return creativeMapper.toAssetResponse(asset);
    }

    @Transactional(readOnly = true)
    public PagedResponse<CreativeAssetResponse> list(
            UUID workspaceId, String type, String status, String query, Pageable pageable) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        AssetType assetType = parseAssetTypeOrNull(type);
        AssetStatus assetStatus = parseAssetStatusOrNull(status);
        Specification<CreativeAsset> spec = assetSpec(workspaceId, assetType, assetStatus, query);
        Page<CreativeAsset> page = assetRepository.findAll(spec, pageable);
        return PagedResponse.from(page.map(creativeMapper::toAssetResponse));
    }

    public CreativeAssetVersionResponse addVersion(
            UUID workspaceId, UUID assetId, CreativeAssetVersionRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeAsset asset =
                assetRepository.findById(assetId).orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertWorkspaceMatch(asset, workspaceId);

        int nextVersion = versionRepository
                .findTopByAssetIdOrderByVersionNumberDesc(assetId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        CreativeAssetVersion version = CreativeAssetVersion.builder()
                .asset(asset)
                .versionNumber(nextVersion)
                .versionType(
                        request.versionType() != null && !request.versionType().isBlank()
                                ? request.versionType()
                                : "MINOR")
                .changeNotes(request.changeNotes())
                .fileUrl(request.fileUrl())
                .checksum(request.checksum())
                .width(request.width())
                .height(request.height())
                .durationSeconds(request.durationSeconds())
                .sizeBytes(request.sizeBytes())
                .metaJson(request.metaJson() != null ? request.metaJson() : "{}")
                .createdByUser(user)
                .build();

        CreativeAssetVersion saved = versionRepository.save(version);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_ASSET_VERSION",
                "CreativeAssetVersion",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toVersionResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CreativeAssetVersionResponse> listVersions(UUID workspaceId, UUID assetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        CreativeAsset asset =
                assetRepository.findById(assetId).orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertWorkspaceMatch(asset, workspaceId);
        return versionRepository.findByAssetIdOrderByVersionNumberDesc(assetId).stream()
                .map(creativeMapper::toVersionResponse)
                .toList();
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private void assertWorkspaceMatch(CreativeAsset asset, UUID workspaceId) {
        if (!asset.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeAsset", "id", asset.getId());
        }
    }

    private AssetType parseAssetType(String raw) {
        try {
            return AssetType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid asset type: " + raw);
        }
    }

    private AssetType parseAssetTypeOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseAssetType(raw.trim());
    }

    private AssetStatus parseAssetStatus(String raw) {
        try {
            return AssetStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid asset status: " + raw);
        }
    }

    private AssetStatus parseAssetStatusOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseAssetStatus(raw.trim());
    }

    private AssetVisibility parseVisibility(String raw) {
        try {
            return AssetVisibility.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid visibility: " + raw);
        }
    }

    private Specification<CreativeAsset> assetSpec(
            UUID workspaceId, AssetType type, AssetStatus status, String query) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("workspace").get("id"), workspaceId));
            if (type != null) {
                predicates.add(cb.equal(root.get("assetType"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (query != null && !query.isBlank()) {
                predicates.add(
                        cb.like(cb.lower(root.get("name")), "%" + query.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
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
