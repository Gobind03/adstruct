package com.avyukt.marketsuite.ai.repo;

import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiActionProposalRepository extends JpaRepository<AiActionProposal, UUID> {

    List<AiActionProposal> findByWorkspaceIdAndStatusOrderByCreatedAtDesc(
            UUID workspaceId, AgentActionStatus status);

    List<AiActionProposal> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);

    List<AiActionProposal> findByConversationId(UUID conversationId);
}
