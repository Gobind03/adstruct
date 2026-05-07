package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeRenderPreset;
import com.avyukt.marketsuite.creative.domain.RenderPreset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeRenderPresetRepository extends JpaRepository<CreativeRenderPreset, UUID> {

    List<CreativeRenderPreset> findByWorkspaceIdOrderByPresetAsc(UUID workspaceId);

    Optional<CreativeRenderPreset> findByWorkspaceIdAndPreset(UUID workspaceId, RenderPreset preset);
}
