package com.avyukt.marketsuite.creative.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "creative_ai_run_links")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreativeAiRunLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "ai_prompt_run_id")
    private UUID aiPromptRunId;

    @Column(name = "ai_conversation_id")
    private UUID aiConversationId;

    @Column(name = "ai_message_id")
    private UUID aiMessageId;

    @Column(name = "produced_entity_type", nullable = false, length = 60)
    private String producedEntityType;

    @Column(name = "produced_entity_id", nullable = false)
    private UUID producedEntityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_context_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String inputContextJson = "{}";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "citations_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String citationsJson = "[]";

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
