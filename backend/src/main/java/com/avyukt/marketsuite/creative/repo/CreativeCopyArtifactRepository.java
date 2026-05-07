package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CopyArtifactType;
import com.avyukt.marketsuite.creative.domain.CopyStatus;
import com.avyukt.marketsuite.creative.domain.CreativeCopyArtifact;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeCopyArtifactRepository
        extends JpaRepository<CreativeCopyArtifact, UUID>, JpaSpecificationExecutor<CreativeCopyArtifact> {

    Page<CreativeCopyArtifact> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    Page<CreativeCopyArtifact> findByWorkspaceIdAndType(
            UUID workspaceId, CopyArtifactType type, Pageable pageable);

    Page<CreativeCopyArtifact> findByWorkspaceIdAndStatus(
            UUID workspaceId, CopyStatus status, Pageable pageable);

    Page<CreativeCopyArtifact> findByWorkspaceIdAndTypeAndStatus(
            UUID workspaceId, CopyArtifactType type, CopyStatus status, Pageable pageable);

    List<CreativeCopyArtifact> findByWorkspaceIdAndNameContainingIgnoreCase(
            UUID workspaceId, String name);
}
