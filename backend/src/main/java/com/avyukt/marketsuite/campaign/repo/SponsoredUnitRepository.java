package com.avyukt.marketsuite.campaign.repo;

import com.avyukt.marketsuite.campaign.domain.SponsoredUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SponsoredUnitRepository extends JpaRepository<SponsoredUnit, UUID> {
    List<SponsoredUnit> findByCampaignId(UUID campaignId);
}
