package com.avyukt.marketsuite.governance.domain;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "template_usages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TemplateUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private Template template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Column(name = "used_in_entity_type", nullable = false, length = 60)
    private String usedInEntityType;

    @Column(name = "used_in_entity_id", nullable = false)
    private UUID usedInEntityId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_by_user_id", nullable = false)
    private AppUser usedByUser;

    @Column(name = "used_at", nullable = false)
    @Builder.Default
    private OffsetDateTime usedAt = OffsetDateTime.now();
}
