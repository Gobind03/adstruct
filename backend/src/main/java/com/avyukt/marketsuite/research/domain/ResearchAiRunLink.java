package com.avyukt.marketsuite.research.domain;

import com.avyukt.marketsuite.ai.domain.AiConversation;
import com.avyukt.marketsuite.ai.domain.AiMessage;
import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "research_ai_run_links")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResearchAiRunLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_prompt_run_id")
    private AiPromptRun aiPromptRun;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_conversation_id")
    private AiConversation aiConversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_message_id")
    private AiMessage aiMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "produced_entity_type", nullable = false, length = 40)
    private ProducedEntityType producedEntityType;

    @Column(name = "produced_entity_id", nullable = false)
    private UUID producedEntityId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "snapshot_ids", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String snapshotIds = "[]";

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
