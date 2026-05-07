package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.ConversationStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {

    List<AiConversation> findByWorkspaceIdAndStatusOrderByUpdatedAtDesc(
            UUID workspaceId, ConversationStatus status);

    List<AiConversation> findByWorkspaceIdOrderByUpdatedAtDesc(UUID workspaceId);
}
