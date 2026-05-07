-- V8: Webhook delivery log + make sync_job_id nullable for webhook-sourced data

ALTER TABLE campaign_report_data ALTER COLUMN sync_job_id DROP NOT NULL;

CREATE TABLE webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id      UUID NOT NULL REFERENCES integration_webhook_endpoints(id) ON DELETE CASCADE,
    platform_type   VARCHAR(30) NOT NULL,
    event_type      VARCHAR(60),
    status          VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    payload_summary VARCHAR(500),
    rows_processed  INT NOT NULL DEFAULT 0,
    error_message   VARCHAR(500),
    received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_delivery_webhook  ON webhook_deliveries(webhook_id);
CREATE INDEX idx_delivery_received ON webhook_deliveries(received_at DESC);
