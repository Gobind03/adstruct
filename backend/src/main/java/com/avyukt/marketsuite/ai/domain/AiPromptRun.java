package com.avyukt.marketsuite.ai.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ai_prompt_runs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiPromptRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prompt_template_id", nullable = false)
    private AiPromptTemplate promptTemplate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_config_id", nullable = false)
    private AiProviderConfig providerConfig;

    @Column(nullable = false, length = 80)
    private String model;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_json", columnDefinition = "jsonb", nullable = false)
    private String inputJson;

    @Column(name = "output_text", columnDefinition = "text")
    private String outputText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_json", columnDefinition = "jsonb")
    private String outputJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "token_usage_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String tokenUsageJson = "{}";

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "SUCCESS";

    @Column(name = "error_message", length = 700)
    private String errorMessage;

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
