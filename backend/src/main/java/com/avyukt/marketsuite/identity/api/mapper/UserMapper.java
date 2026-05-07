package com.avyukt.marketsuite.identity.api.mapper;

import com.avyukt.marketsuite.identity.api.dto.UserResponse;
import com.avyukt.marketsuite.identity.domain.AppUser;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(AppUser entity);
}
