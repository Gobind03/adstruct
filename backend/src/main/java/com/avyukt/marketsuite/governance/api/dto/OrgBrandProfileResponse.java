package com.avyukt.marketsuite.governance.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record OrgBrandProfileResponse(
        UUID id,
        UUID orgId,
        String displayName,
        String status,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String fontPrimary,
        String fontSecondary,
        UUID logoAssetId,
        String voiceTone,
        String voiceGuidelinesText,
        String doListText,
        String dontListText,
        String defaultLanguage,
        String supportedLanguages,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {}
