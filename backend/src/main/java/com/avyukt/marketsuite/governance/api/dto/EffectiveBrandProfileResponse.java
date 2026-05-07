package com.avyukt.marketsuite.governance.api.dto;

import java.util.UUID;

public record EffectiveBrandProfileResponse(
        UUID orgBrandProfileId,
        UUID workspaceBrandProfileId,
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
        String overridesJson) {}
