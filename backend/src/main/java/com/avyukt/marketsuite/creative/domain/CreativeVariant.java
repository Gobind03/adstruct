package com.avyukt.marketsuite.creative.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "creative_variants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreativeVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_set_id", nullable = false)
    private CreativeVariantSet variantSet;

    @Column(name = "variant_index", nullable = false)
    private int variantIndex;

    @Column(name = "entity_type", nullable = false, length = 60)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(precision = 19, scale = 6)
    private BigDecimal score;

    @Column(length = 300)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
