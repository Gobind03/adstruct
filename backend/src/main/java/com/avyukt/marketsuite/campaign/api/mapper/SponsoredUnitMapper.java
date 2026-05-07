package com.avyukt.marketsuite.campaign.api.mapper;

import com.avyukt.marketsuite.campaign.api.dto.SponsoredUnitRequest;
import com.avyukt.marketsuite.campaign.api.dto.SponsoredUnitResponse;
import com.avyukt.marketsuite.campaign.domain.SponsoredUnit;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SponsoredUnitMapper {
    @Mapping(source = "campaign.id", target = "campaignId")
    SponsoredUnitResponse toResponse(SponsoredUnit entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "campaign", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    SponsoredUnit toEntity(SponsoredUnitRequest request);
}
