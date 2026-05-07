package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeAssetFolderMap;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeAssetFolderMapRepository extends JpaRepository<CreativeAssetFolderMap, UUID> {

    List<CreativeAssetFolderMap> findByFolderId(UUID folderId);

    List<CreativeAssetFolderMap> findByAssetId(UUID assetId);

    Optional<CreativeAssetFolderMap> findByFolderIdAndAssetId(UUID folderId, UUID assetId);

    void deleteByFolderIdAndAssetId(UUID folderId, UUID assetId);
}
