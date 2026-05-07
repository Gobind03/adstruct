-- V7: Campaign Report Data - persisted sync results

CREATE TABLE campaign_report_data (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_job_id             UUID NOT NULL REFERENCES integration_sync_jobs(id) ON DELETE CASCADE,
    integration_account_id  UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    workspace_id            UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    internal_campaign_id    UUID REFERENCES conversation_campaigns(id) ON DELETE SET NULL,
    platform_type           VARCHAR(30) NOT NULL,
    external_campaign_id    VARCHAR(190) NOT NULL,
    campaign_name           VARCHAR(500),
    campaign_status         VARCHAR(30),
    spend                   NUMERIC(14,4) NOT NULL DEFAULT 0,
    impressions             BIGINT NOT NULL DEFAULT 0,
    clicks                  BIGINT NOT NULL DEFAULT 0,
    cpc                     NUMERIC(10,4),
    cpm                     NUMERIC(10,4),
    ctr                     NUMERIC(8,6),
    conversions             BIGINT NOT NULL DEFAULT 0,
    report_date             DATE NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_report_account_campaign_date
        UNIQUE(integration_account_id, external_campaign_id, report_date)
);

CREATE INDEX idx_report_account       ON campaign_report_data(integration_account_id);
CREATE INDEX idx_report_workspace     ON campaign_report_data(workspace_id);
CREATE INDEX idx_report_internal_camp ON campaign_report_data(internal_campaign_id);
CREATE INDEX idx_report_date          ON campaign_report_data(report_date);
CREATE INDEX idx_report_ext_campaign  ON campaign_report_data(integration_account_id, external_campaign_id);
