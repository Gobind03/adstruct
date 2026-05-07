package com.avyukt.marketsuite.research.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "competitor_external_handles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitorExternalHandle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "competitor_id", nullable = false)
    private Competitor competitor;

    @Column(name = "platform_type", nullable = false, length = 80)
    private String platformType;

    @Column(nullable = false, length = 255)
    private String handle;

    @Column(length = 2000)
    private String url;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }
}
