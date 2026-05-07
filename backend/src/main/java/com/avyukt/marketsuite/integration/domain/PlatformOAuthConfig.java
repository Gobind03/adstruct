package com.avyukt.marketsuite.integration.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "platform_oauth_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformOAuthConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "platform_type", nullable = false, unique = true, length = 40)
    private PlatformType platformType;

    @Column(name = "client_id", nullable = false, length = 300)
    private String clientId;

    @Column(name = "encrypted_client_secret", nullable = false, length = 500)
    private String encryptedClientSecret;

    @Column(name = "auth_url", nullable = false, length = 500)
    private String authUrl;

    @Column(name = "token_url", nullable = false, length = 500)
    private String tokenUrl;

    @Column(nullable = false, length = 500)
    private String scopes;

    @Column(name = "redirect_uri", nullable = false, length = 300)
    private String redirectUri;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra_params_json", columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private String extraParamsJson = "{}";

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = false;

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
