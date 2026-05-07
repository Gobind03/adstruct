package com.avyukt.marketsuite.campaign.api.mapper;

import com.avyukt.marketsuite.campaign.api.dto.ApprovalResponse;
import com.avyukt.marketsuite.campaign.domain.ApprovalWorkflow;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ApprovalMapper {
    ApprovalResponse toResponse(ApprovalWorkflow entity);
}
