package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CreativeAssetResponse;
import com.avyukt.marketsuite.creative.api.dto.FolderCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.FolderResponse;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import com.avyukt.marketsuite.creative.domain.CreativeAssetFolderMap;
import com.avyukt.marketsuite.creative.domain.CreativeFolder;
import com.avyukt.marketsuite.creative.repo.CreativeAssetFolderMapRepository;
import com.avyukt.marketsuite.creative.repo.CreativeAssetRepository;
import com.avyukt.marketsuite.creative.repo.CreativeFolderRepository;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CreativeFolderService {

    private final CreativeFolderRepository folderRepository;
    private final CreativeAssetRepository assetRepository;
    private final CreativeAssetFolderMapRepository assetFolderMapRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;
    private final CreativeMapper creativeMapper;

    public CreativeFolderService(
            CreativeFolderRepository folderRepository,
            CreativeAssetRepository assetRepository,
            CreativeAssetFolderMapRepository assetFolderMapRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService,
            CreativeMapper creativeMapper) {
        this.folderRepository = folderRepository;
        this.assetRepository = assetRepository;
        this.assetFolderMapRepository = assetFolderMapRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
        this.creativeMapper = creativeMapper;
    }

    public FolderResponse create(UUID workspaceId, FolderCreateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeFolder folder = CreativeFolder.builder()
                .workspace(ws)
                .name(request.name())
                .parentFolderId(request.parentFolderId())
                .build();
        CreativeFolder saved = folderRepository.save(folder);
        return creativeMapper.toFolderResponse(saved);
    }

    public FolderResponse update(UUID workspaceId, UUID folderId, String name) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeFolder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeFolder", "id", folderId));
        assertFolderWorkspace(folder, workspaceId);
        folder.setName(name);
        CreativeFolder saved = folderRepository.save(folder);
        return creativeMapper.toFolderResponse(saved);
    }

    public void delete(UUID workspaceId, UUID folderId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeFolder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeFolder", "id", folderId));
        assertFolderWorkspace(folder, workspaceId);
        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> list(UUID workspaceId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        return folderRepository.findByWorkspaceIdOrderByNameAsc(workspaceId).stream()
                .map(creativeMapper::toFolderResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CreativeAssetResponse> listAssetsInFolder(UUID workspaceId, UUID folderId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        CreativeFolder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeFolder", "id", folderId));
        assertFolderWorkspace(folder, workspaceId);

        return assetFolderMapRepository.findByFolderId(folderId).stream()
                .map(m -> creativeMapper.toAssetResponse(m.getAsset()))
                .toList();
    }

    public void addAsset(UUID workspaceId, UUID folderId, UUID assetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeFolder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeFolder", "id", folderId));
        assertFolderWorkspace(folder, workspaceId);

        CreativeAsset asset = assetRepository
                .findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));
        assertAssetWorkspace(asset, workspaceId);

        if (assetFolderMapRepository.findByFolderIdAndAssetId(folderId, assetId).isPresent()) {
            return;
        }
        CreativeAssetFolderMap map =
                CreativeAssetFolderMap.builder().folder(folder).asset(asset).build();
        assetFolderMapRepository.save(map);
    }

    public void removeAsset(UUID workspaceId, UUID folderId, UUID assetId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);

        CreativeFolder folder = folderRepository
                .findById(folderId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeFolder", "id", folderId));
        assertFolderWorkspace(folder, workspaceId);

        assetRepository
                .findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeAsset", "id", assetId));

        assetFolderMapRepository.deleteByFolderIdAndAssetId(folderId, assetId);
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private void assertFolderWorkspace(CreativeFolder folder, UUID workspaceId) {
        if (!folder.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeFolder", "id", folder.getId());
        }
    }

    private void assertAssetWorkspace(CreativeAsset asset, UUID workspaceId) {
        if (!asset.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeAsset", "id", asset.getId());
        }
    }
}
