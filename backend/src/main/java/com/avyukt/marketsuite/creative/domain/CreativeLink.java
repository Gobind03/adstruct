package com.avyukt.marketsuite.creative.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "creative_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreativeLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "from_entity_type", nullable = false, length = 60)
    private String fromEntityType;

    @Column(name = "from_entity_id", nullable = false)
    private UUID fromEntityId;

    @Column(name = "to_entity_type", nullable = false, length = 60)
    private String toEntityType;

    @Column(name = "to_entity_id", nullable = false)
    private UUID toEntityId;

    @Column(name = "relation_type", nullable = false, length = 30)
    private String relationType;

    @Column(length = 400)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private AppUser createdByUser;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
