package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeAssetVersion;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeAssetVersionRepository extends JpaRepository<CreativeAssetVersion, UUID> {

    List<CreativeAssetVersion> findByAssetIdOrderByVersionNumberDesc(UUID assetId);

    Optional<CreativeAssetVersion> findTopByAssetIdOrderByVersionNumberDesc(UUID assetId);
}
