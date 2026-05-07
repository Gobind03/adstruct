package com.avyukt.marketsuite.research.repo;

import com.avyukt.marketsuite.research.domain.PersonaResearch;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PersonaResearchRepository extends JpaRepository<PersonaResearch, UUID> {

    List<PersonaResearch> findByWorkspaceId(UUID workspaceId);
}
