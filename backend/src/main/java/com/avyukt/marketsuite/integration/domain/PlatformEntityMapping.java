package com.avyukt.marketsuite.integration.domain;

import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "platform_entity_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformEntityMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "integration_account_id", nullable = false)
    private IntegrationAccount integrationAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private IntegrationResource resource;

    @Column(name = "internal_entity_type", nullable = false, length = 60)
    private String internalEntityType;

    @Column(name = "internal_entity_id", nullable = false)
    private UUID internalEntityId;

    @Column(name = "external_entity_type", nullable = false, length = 60)
    private String externalEntityType;

    @Column(name = "external_entity_id", nullable = false, length = 190)
    private String externalEntityId;

    @Column(name = "external_parent_id", length = 190)
    private String externalParentId;

    @Column(name = "mapping_status", nullable = false, length = 30)
    @Builder.Default
    private String mappingStatus = "ACTIVE";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "meta_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String metaJson = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
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
