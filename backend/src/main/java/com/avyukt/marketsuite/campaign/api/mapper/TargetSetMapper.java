package com.avyukt.marketsuite.campaign.api.mapper;

import com.avyukt.marketsuite.campaign.api.dto.TargetSetRequest;
import com.avyukt.marketsuite.campaign.api.dto.TargetSetResponse;
import com.avyukt.marketsuite.campaign.domain.TargetSet;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TargetSetMapper {
    @Mapping(source = "campaign.id", target = "campaignId")
    TargetSetResponse toResponse(TargetSet entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "campaign", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    TargetSet toEntity(TargetSetRequest request);
}
