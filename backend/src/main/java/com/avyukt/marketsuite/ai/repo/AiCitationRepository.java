package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiCitation;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiCitationRepository extends JpaRepository<AiCitation, UUID> {

    List<AiCitation> findByMessageId(UUID messageId);

    List<AiCitation> findByMessageIdIn(List<UUID> messageIds);
}
