package com.avyukt.marketsuite.creative.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "creative_copy_artifacts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreativeCopyArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization org;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 40)
    private CopyArtifactType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CopyStatus status = CopyStatus.DRAFT;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(nullable = false, length = 12)
    @Builder.Default
    private String language = "en";

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CreativeFormat format;

    @Column(name = "content_text", nullable = false, columnDefinition = "text")
    private String contentText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String contentJson = "{}";

    @Column(name = "template_id")
    private UUID templateId;

    @Column(name = "rule_set_id")
    private UUID ruleSetId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "disclaimer_ids", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String disclaimerIds = "[]";

    @Column(name = "governance_check_run_id")
    private UUID governanceCheckRunId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private AppUser createdByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_user_id", nullable = false)
    private AppUser updatedByUser;

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
