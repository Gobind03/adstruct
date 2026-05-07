package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.AssetStatus;
import com.avyukt.marketsuite.creative.domain.AssetType;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeAssetRepository
        extends JpaRepository<CreativeAsset, UUID>, JpaSpecificationExecutor<CreativeAsset> {

    Page<CreativeAsset> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    Page<CreativeAsset> findByWorkspaceIdAndStatus(
            UUID workspaceId, AssetStatus status, Pageable pageable);

    Page<CreativeAsset> findByWorkspaceIdAndAssetType(
            UUID workspaceId, AssetType assetType, Pageable pageable);

    Page<CreativeAsset> findByWorkspaceIdAndAssetTypeAndStatus(
            UUID workspaceId, AssetType assetType, AssetStatus status, Pageable pageable);

    List<CreativeAsset> findByWorkspaceIdAndNameContainingIgnoreCase(UUID workspaceId, String name);
}
