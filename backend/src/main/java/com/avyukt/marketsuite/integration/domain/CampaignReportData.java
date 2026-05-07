package com.avyukt.marketsuite.integration.domain;

import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "campaign_report_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampaignReportData {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sync_job_id")
    private IntegrationSyncJob syncJob;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "integration_account_id", nullable = false)
    private IntegrationAccount integrationAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "internal_campaign_id")
    private ConversationCampaign internalCampaign;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_type", nullable = false, length = 30)
    private PlatformType platformType;

    @Column(name = "external_campaign_id", nullable = false, length = 190)
    private String externalCampaignId;

    @Column(name = "campaign_name", length = 500)
    private String campaignName;

    @Column(name = "campaign_status", length = 30)
    private String campaignStatus;

    @Column(nullable = false, precision = 14, scale = 4)
    @Builder.Default
    private BigDecimal spend = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private long impressions = 0;

    @Column(nullable = false)
    @Builder.Default
    private long clicks = 0;

    @Column(precision = 10, scale = 4)
    private BigDecimal cpc;

    @Column(precision = 10, scale = 4)
    private BigDecimal cpm;

    @Column(precision = 8, scale = 6)
    private BigDecimal ctr;

    @Column(nullable = false)
    @Builder.Default
    private long conversions = 0;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

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
