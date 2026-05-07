package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.Watchlist;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {

    List<Watchlist> findByWorkspaceId(UUID workspaceId);
}
