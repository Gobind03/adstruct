package com.avyukt.marketsuite.identity.api.mapper;

import com.avyukt.marketsuite.identity.api.dto.WorkspaceCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.WorkspaceResponse;
import com.avyukt.marketsuite.identity.domain.Workspace;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WorkspaceMapper {

    @Mapping(source = "org.id", target = "orgId")
    WorkspaceResponse toResponse(Workspace entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "org", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Workspace toEntity(WorkspaceCreateRequest request);
}
