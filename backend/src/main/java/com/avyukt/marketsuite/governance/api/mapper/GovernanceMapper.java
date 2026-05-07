package com.avyukt.marketsuite.governance.api.mapper;

import com.avyukt.marketsuite.governance.api.dto.*;
import com.avyukt.marketsuite.governance.domain.*;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GovernanceMapper {

    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "voiceTone", target = "voiceTone")
    @Mapping(source = "status", target = "status")
    OrgBrandProfileResponse toOrgProfileResponse(OrgBrandProfile entity);

    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "workspace.id", target = "workspaceId")
    BrandAssetResponse toBrandAssetResponse(BrandAsset entity);

    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "workspace.id", target = "workspaceId")
    BrandRuleSetResponse toRuleSetResponse(BrandRuleSet entity);

    @Mapping(source = "ruleSet.id", target = "ruleSetId")
    BrandRuleResponse toRuleResponse(BrandRule entity);

    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "workspace.id", target = "workspaceId")
    DisclaimerResponse toDisclaimerResponse(Disclaimer entity);

    @Mapping(source = "disclaimer.id", target = "disclaimerId")
    DisclaimerLocalizationResponse toLocalizationResponse(DisclaimerLocalization entity);

    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "ruleSet.id", target = "ruleSetId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "updatedByUser.id", target = "updatedByUserId")
    TemplateResponse toTemplateResponse(Template entity);

    @Mapping(source = "template.id", target = "templateId")
    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "usedByUser.id", target = "usedByUserId")
    TemplateUsageResponse toUsageResponse(TemplateUsage entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    GovernanceCheckRunResponse toCheckRunResponse(GovernanceCheckRun entity);

    PlatformConstraintResponse toConstraintResponse(PlatformConstraint entity);
}
