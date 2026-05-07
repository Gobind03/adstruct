package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiToolDefinition;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiToolDefinitionRepository extends JpaRepository<AiToolDefinition, UUID> {

    Optional<AiToolDefinition> findByName(String name);

    List<AiToolDefinition> findByEnabledTrue();
}
