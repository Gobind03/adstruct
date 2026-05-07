package com.avyukt.marketsuite.measurement.api.mapper;

import com.avyukt.marketsuite.measurement.api.dto.AdEventRequest;
import com.avyukt.marketsuite.measurement.api.dto.AdEventResponse;
import com.avyukt.marketsuite.measurement.domain.AdEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AdEventMapper {
    AdEventResponse toResponse(AdEvent entity);

    @Mapping(target = "id", ignore = true)
    AdEvent toEntity(AdEventRequest request);
}
