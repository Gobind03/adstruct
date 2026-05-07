package com.avyukt.marketsuite.campaign.api.mapper;

import com.avyukt.marketsuite.campaign.api.dto.CampaignCreateRequest;
import com.avyukt.marketsuite.campaign.api.dto.CampaignResponse;
import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CampaignMapper {
    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "integrationAccount.id", target = "integrationAccountId")
    CampaignResponse toResponse(ConversationCampaign entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "workspace", ignore = true)
    @Mapping(target = "integrationAccount", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    ConversationCampaign toEntity(CampaignCreateRequest request);
}
