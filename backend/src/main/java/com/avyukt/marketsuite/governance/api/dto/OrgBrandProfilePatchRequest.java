package com.avyukt.marketsuite.governance.api.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OrgBrandProfilePatchRequest(
        @Size(max = 160) String displayName,
        String status,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color") String primaryColor,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color") String secondaryColor,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid hex color") String accentColor,
        @Size(max = 80) String fontPrimary,
        @Size(max = 80) String fontSecondary,
        String logoAssetId,
        String voiceTone,
        String voiceGuidelinesText,
        String doListText,
        String dontListText,
        @Size(max = 12) String defaultLanguage,
        String supportedLanguages) {}
