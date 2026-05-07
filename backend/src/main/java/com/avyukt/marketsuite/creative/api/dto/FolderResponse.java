package com.avyukt.marketsuite.creative.api.dto;

import java.util.UUID;

public record FolderResponse(
    UUID id,
    UUID workspaceId,
    String name,
    UUID parentFolderId,
    String createdAt,
    String updatedAt
) {}
