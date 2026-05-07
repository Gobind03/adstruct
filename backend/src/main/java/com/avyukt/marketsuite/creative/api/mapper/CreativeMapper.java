package com.avyukt.marketsuite.creative.api.mapper;

import com.avyukt.marketsuite.creative.api.dto.*;
import com.avyukt.marketsuite.creative.domain.*;
import java.time.OffsetDateTime;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface CreativeMapper {

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "updatedByUser.id", target = "updatedByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "offsetDateTimeToString")
    CreativeAssetResponse toAssetResponse(CreativeAsset entity);

    @Mapping(source = "asset.id", target = "assetId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    CreativeAssetVersionResponse toVersionResponse(CreativeAssetVersion entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "org.id", target = "orgId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "updatedByUser.id", target = "updatedByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "offsetDateTimeToString")
    CopyArtifactResponse toCopyResponse(CreativeCopyArtifact entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "offsetDateTimeToString")
    VariantSetResponse toVariantSetResponse(CreativeVariantSet entity);

    @Mapping(source = "variantSet.id", target = "variantSetId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    VariantResponse toVariantResponse(CreativeVariant entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    CreativeUsageResponse toUsageResponse(CreativeUsage entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    CreativeLinkResponse toLinkResponse(CreativeLink entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdByUser.id", target = "createdByUserId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    CreativeAiRunLinkResponse toAiRunLinkResponse(CreativeAiRunLink entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "offsetDateTimeToString")
    FolderResponse toFolderResponse(CreativeFolder entity);

    @Mapping(source = "workspace.id", target = "workspaceId")
    @Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "offsetDateTimeToString")
    @Mapping(source = "updatedAt", target = "updatedAt", qualifiedByName = "offsetDateTimeToString")
    RenderPresetResponse toPresetResponse(CreativeRenderPreset entity);

    @Named("offsetDateTimeToString")
    default String offsetDateTimeToString(OffsetDateTime value) {
        return value == null ? null : value.toString();
    }
}
