package com.avyukt.marketsuite.campaign.repo;

import com.avyukt.marketsuite.campaign.domain.TargetSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TargetSetRepository extends JpaRepository<TargetSet, UUID> {
    List<TargetSet> findByCampaignId(UUID campaignId);
}
