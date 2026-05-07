package com.avyukt.marketsuite.campaign.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "target_sets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TargetSet {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private ConversationCampaign campaign;

    @Enumerated(EnumType.STRING)
    @Column(name = "intent_type", nullable = false)
    private IntentType intentType;

    @Column(name = "topics_json", columnDefinition = "jsonb")
    private String topicsJson;

    @Column(name = "geo_json", columnDefinition = "jsonb")
    private String geoJson;

    @Column(name = "negative_topics_json", columnDefinition = "jsonb")
    private String negativeTopicsJson;

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
