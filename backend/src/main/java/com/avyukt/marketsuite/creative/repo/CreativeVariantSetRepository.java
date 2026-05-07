package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeVariantSet;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeVariantSetRepository extends JpaRepository<CreativeVariantSet, UUID> {

    List<CreativeVariantSet> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<CreativeVariantSet> findByParentEntityTypeAndParentEntityId(
            String parentEntityType, UUID parentEntityId);
}
