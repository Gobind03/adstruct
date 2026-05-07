package com.avyukt.marketsuite.campaign.repo;

import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.CampaignStatus;
import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ConversationCampaignRepository extends JpaRepository<ConversationCampaign, UUID> {
    Page<ConversationCampaign> findByWorkspaceId(UUID workspaceId, Pageable pageable);
    Page<ConversationCampaign> findByWorkspaceIdAndStatus(UUID workspaceId, CampaignStatus status, Pageable pageable);
    Page<ConversationCampaign> findByWorkspaceIdAndObjective(UUID workspaceId, CampaignObjective objective, Pageable pageable);
}
