package com.avyukt.marketsuite.campaign.api.dto;

import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.CampaignStatus;

public record CampaignFilterParams(CampaignStatus status, CampaignObjective objective) {}
