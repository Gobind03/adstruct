package com.avyukt.marketsuite.ai.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ai_citations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiCitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private AiMessage message;

    @Enumerated(EnumType.STRING)
    @Column(name = "citation_type", nullable = false, length = 30)
    private CitationType citationType;

    @Column(name = "reference_type", nullable = false, length = 60)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(length = 700)
    private String url;

    @Column(length = 200)
    private String label;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "meta_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String metaJson = "{}";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
