package com.avyukt.marketsuite.ai.domain;

import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "ai_provider_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiProviderConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization org;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "integration_account_id")
    private IntegrationAccount integrationAccount;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 40)
    private LlmProviderType providerType;

    @Column(name = "default_model", nullable = false, length = 80)
    private String defaultModel;

    @Column(name = "endpoint_base_url", length = 300)
    private String endpointBaseUrl;

    @Column(name = "request_timeout_ms", nullable = false)
    @Builder.Default
    private int requestTimeoutMs = 30000;

    @Column(name = "max_tokens", nullable = false)
    @Builder.Default
    private int maxTokens = 2048;

    @Column(name = "temperature", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal temperature = new BigDecimal("0.40");

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

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
