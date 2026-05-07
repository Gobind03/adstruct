package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.KeywordCluster;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface KeywordClusterRepository extends JpaRepository<KeywordCluster, UUID> {

    List<KeywordCluster> findByWorkspaceId(UUID workspaceId);
}
