package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.WebhookDelivery;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookDeliveryRepository extends JpaRepository<WebhookDelivery, UUID> {

    @Query("SELECT d FROM WebhookDelivery d"
            + " WHERE d.webhook.id = :webhookId"
            + " ORDER BY d.receivedAt DESC")
    List<WebhookDelivery> findByWebhookIdRecent(@Param("webhookId") UUID webhookId);

    @Query("SELECT d FROM WebhookDelivery d"
            + " WHERE d.webhook.integrationAccount.id = :accountId"
            + " ORDER BY d.receivedAt DESC")
    List<WebhookDelivery> findByAccountIdRecent(@Param("accountId") UUID accountId);

    @Query(value = "SELECT d.* FROM webhook_deliveries d"
            + " JOIN integration_webhook_endpoints w ON w.id = d.webhook_id"
            + " JOIN integration_accounts ia ON ia.id = w.integration_account_id"
            + " WHERE ia.org_id = CAST(:orgId AS uuid)"
            + " ORDER BY d.received_at DESC LIMIT 50",
            nativeQuery = true)
    List<WebhookDelivery> findRecentByOrgId(@Param("orgId") UUID orgId);
}
