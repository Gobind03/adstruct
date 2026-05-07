package com.avyukt.marketsuite.creative.api.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record FolderCreateRequest(
    @NotBlank String name,
    UUID parentFolderId
) {}
