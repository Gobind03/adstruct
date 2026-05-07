package com.avyukt.marketsuite.governance.domain;

import com.avyukt.marketsuite.identity.domain.Organization;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "org_brand_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgBrandProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false, unique = true)
    private Organization org;

    @Column(name = "display_name", nullable = false, length = 160)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BrandStatus status = BrandStatus.ACTIVE;

    @Column(name = "primary_color", length = 7)
    private String primaryColor;

    @Column(name = "secondary_color", length = 7)
    private String secondaryColor;

    @Column(name = "accent_color", length = 7)
    private String accentColor;

    @Column(name = "font_primary", length = 80)
    private String fontPrimary;

    @Column(name = "font_secondary", length = 80)
    private String fontSecondary;

    @Column(name = "logo_asset_id")
    private UUID logoAssetId;

    @Enumerated(EnumType.STRING)
    @Column(name = "voice_tone", nullable = false, length = 30)
    @Builder.Default
    private ToneStyle voiceTone = ToneStyle.PROFESSIONAL;

    @Column(name = "voice_guidelines_text", columnDefinition = "text")
    private String voiceGuidelinesText;

    @Column(name = "do_list_text", columnDefinition = "text")
    private String doListText;

    @Column(name = "dont_list_text", columnDefinition = "text")
    private String dontListText;

    @Column(name = "default_language", nullable = false, length = 12)
    @Builder.Default
    private String defaultLanguage = "en";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "supported_languages", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String supportedLanguages = "[\"en\"]";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
