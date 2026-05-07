package com.avyukt.marketsuite.measurement.domain;

import com.avyukt.marketsuite.integration.domain.PlatformType;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ad_events")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "campaign_id", nullable = false)
    private UUID campaignId;

    @Column(name = "sponsored_unit_id")
    private UUID sponsoredUnitId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    private AdEventType eventType;

    @Column(name = "event_time", nullable = false)
    private OffsetDateTime eventTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_type")
    private PlatformType platformType;

    @Column(name = "meta_json", columnDefinition = "jsonb")
    private String metaJson;

    @Column(name = "session_id")
    private String sessionId;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "ip_hash")
    private String ipHash;
}
