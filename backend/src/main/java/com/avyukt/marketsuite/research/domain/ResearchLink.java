package com.avyukt.marketsuite.research.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "research_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResearchLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Enumerated(EnumType.STRING)
    @Column(name = "research_entity_type", nullable = false, length = 40)
    private ResearchEntityType researchEntityType;

    @Column(name = "research_entity_id", nullable = false)
    private UUID researchEntityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "linked_entity_type", nullable = false, length = 40)
    private LinkedEntityType linkedEntityType;

    @Column(name = "linked_entity_id", nullable = false)
    private UUID linkedEntityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type", nullable = false, length = 40)
    private RelationType relationType;

    @Column(columnDefinition = "text")
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
