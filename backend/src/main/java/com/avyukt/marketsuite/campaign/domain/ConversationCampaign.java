package com.avyukt.marketsuite.campaign.domain;

import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "conversation_campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConversationCampaign {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "integration_account_id", nullable = false)
    private IntegrationAccount integrationAccount;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CampaignObjective objective;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Column(name = "daily_budget", precision = 15, scale = 2)
    private BigDecimal dailyBudget;

    @Column(name = "lifetime_budget", precision = 15, scale = 2)
    private BigDecimal lifetimeBudget;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "pacing_mode")
    @Builder.Default
    private PacingMode pacingMode = PacingMode.STANDARD;

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
