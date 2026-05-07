package com.avyukt.marketsuite.identity.api.mapper;

import com.avyukt.marketsuite.identity.api.dto.OrganizationCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.OrganizationResponse;
import com.avyukt.marketsuite.identity.domain.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrganizationMapper {

    @Mapping(target = "workspaceCount", ignore = true)
    @Mapping(target = "memberCount", ignore = true)
    OrganizationResponse toResponse(Organization entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Organization toEntity(OrganizationCreateRequest request);
}
