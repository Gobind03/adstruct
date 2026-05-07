package com.avyukt.marketsuite.creative.repo;

import com.avyukt.marketsuite.creative.domain.CreativeFolder;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreativeFolderRepository extends JpaRepository<CreativeFolder, UUID> {

    List<CreativeFolder> findByWorkspaceIdOrderByNameAsc(UUID workspaceId);

    List<CreativeFolder> findByWorkspaceIdAndParentFolderIdOrderByNameAsc(
            UUID workspaceId, UUID parentFolderId);
}
