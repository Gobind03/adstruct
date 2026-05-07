package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiToolCall;
import com.avyukt.marketsuite.ai.domain.ToolCallStatus;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiToolCallRepository extends JpaRepository<AiToolCall, UUID> {

    List<AiToolCall> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<AiToolCall> findByConversationIdAndStatus(UUID conversationId, ToolCallStatus status);

    long countByConversationIdAndStatusIn(UUID conversationId, Collection<ToolCallStatus> statuses);
}
