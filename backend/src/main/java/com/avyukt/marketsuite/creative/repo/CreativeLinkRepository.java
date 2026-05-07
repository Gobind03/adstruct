package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeLink;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeLinkRepository extends JpaRepository<CreativeLink, UUID> {

    List<CreativeLink> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<CreativeLink> findByWorkspaceIdAndFromEntityTypeAndFromEntityId(
            UUID workspaceId, String fromEntityType, UUID fromEntityId);

    List<CreativeLink> findByWorkspaceIdAndToEntityTypeAndToEntityId(
            UUID workspaceId, String toEntityType, UUID toEntityId);
}
