-- V5: Integrations Hub - full integration layer

-- ============================================================
-- 1. integration_providers: platform catalog
-- ============================================================
CREATE TABLE integration_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_type VARCHAR(40) NOT NULL UNIQUE,
    category VARCHAR(40) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    auth_type VARCHAR(30) NOT NULL,
    capabilities_json JSONB NOT NULL DEFAULT '{}',
    docs_url VARCHAR(400),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_provider_category ON integration_providers(category);

-- ============================================================
-- 2. platform_oauth_configs: OAuth client credentials per platform
-- ============================================================
CREATE TABLE platform_oauth_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_type VARCHAR(40) NOT NULL UNIQUE,
    client_id VARCHAR(300) NOT NULL,
    encrypted_client_secret VARCHAR(500) NOT NULL,
    auth_url VARCHAR(500) NOT NULL,
    token_url VARCHAR(500) NOT NULL,
    scopes VARCHAR(500) NOT NULL,
    redirect_uri VARCHAR(300) NOT NULL,
    extra_params_json JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. secret_store_records: encrypted credential storage
-- ============================================================
CREATE TABLE secret_store_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref VARCHAR(200) NOT NULL UNIQUE,
    encrypted_payload BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. oauth_state_tokens: CSRF state for OAuth flows
-- ============================================================
CREATE TABLE oauth_state_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(200) NOT NULL UNIQUE,
    platform_type VARCHAR(40) NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    display_name VARCHAR(160),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_oauth_state_expires ON oauth_state_tokens(expires_at);

-- ============================================================
-- 5. Evolve integration_accounts
-- ============================================================

-- 5a. Rename enum values in existing data
UPDATE integration_accounts SET platform_type = 'CHATGPT_ADS' WHERE platform_type = 'CHATGPT';
UPDATE integration_accounts SET auth_type = 'OAUTH2' WHERE auth_type = 'OAUTH';

-- 5b. Add new columns (nullable first for backfill)
ALTER TABLE integration_accounts ADD COLUMN provider_id UUID REFERENCES integration_providers(id);
ALTER TABLE integration_accounts ADD COLUMN external_account_id VARCHAR(190);
ALTER TABLE integration_accounts ADD COLUMN connected_by_user_id UUID REFERENCES users(id);
ALTER TABLE integration_accounts ADD COLUMN last_validated_at TIMESTAMPTZ;
ALTER TABLE integration_accounts ADD COLUMN error_code VARCHAR(60);
ALTER TABLE integration_accounts ADD COLUMN error_message VARCHAR(400);

-- 5c. Add indexes
CREATE INDEX idx_integration_account_provider ON integration_accounts(provider_id);
CREATE INDEX idx_integration_account_status ON integration_accounts(status);

-- ============================================================
-- 6. integration_resources
-- ============================================================
CREATE TABLE integration_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    resource_type VARCHAR(40) NOT NULL,
    external_resource_id VARCHAR(190) NOT NULL,
    display_name VARCHAR(190) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED',
    meta_json JSONB NOT NULL DEFAULT '{}',
    last_discovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_resource_account_type_ext UNIQUE(integration_account_id, resource_type, external_resource_id)
);
CREATE INDEX idx_resource_account ON integration_resources(integration_account_id);
CREATE INDEX idx_resource_type_status ON integration_resources(resource_type, status);

-- ============================================================
-- 7. workspace_integrations
-- ============================================================
CREATE TABLE workspace_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    integration_resource_id UUID REFERENCES integration_resources(id) ON DELETE SET NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    settings_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX uq_ws_integ_account_resource ON workspace_integrations(workspace_id, integration_account_id, integration_resource_id) WHERE integration_resource_id IS NOT NULL;
CREATE UNIQUE INDEX uq_ws_integ_account_null_resource ON workspace_integrations(workspace_id, integration_account_id) WHERE integration_resource_id IS NULL;
CREATE INDEX idx_ws_integration_workspace ON workspace_integrations(workspace_id);
CREATE INDEX idx_ws_integration_account ON workspace_integrations(integration_account_id);
CREATE INDEX idx_ws_integration_enabled ON workspace_integrations(workspace_id, enabled);

-- ============================================================
-- 8. platform_entity_mappings
-- ============================================================
CREATE TABLE platform_entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES integration_resources(id) ON DELETE SET NULL,
    internal_entity_type VARCHAR(60) NOT NULL,
    internal_entity_id UUID NOT NULL,
    external_entity_type VARCHAR(60) NOT NULL,
    external_entity_id VARCHAR(190) NOT NULL,
    external_parent_id VARCHAR(190),
    mapping_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    meta_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_mapping_internal UNIQUE(workspace_id, integration_account_id, internal_entity_type, internal_entity_id, external_entity_type)
);
CREATE INDEX idx_mapping_internal ON platform_entity_mappings(workspace_id, internal_entity_type, internal_entity_id);
CREATE INDEX idx_mapping_external ON platform_entity_mappings(integration_account_id, external_entity_type, external_entity_id);
CREATE INDEX idx_mapping_workspace ON platform_entity_mappings(workspace_id);

-- ============================================================
-- 9. integration_sync_jobs
-- ============================================================
CREATE TABLE integration_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES integration_resources(id) ON DELETE SET NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    sync_mode VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    cursor_json JSONB,
    stats_json JSONB NOT NULL DEFAULT '{}',
    error_message VARCHAR(500),
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sync_job_account_status ON integration_sync_jobs(integration_account_id, status);
CREATE INDEX idx_sync_job_workspace ON integration_sync_jobs(workspace_id);

-- ============================================================
-- 10. integration_webhook_endpoints
-- ============================================================
CREATE TABLE integration_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    endpoint_url VARCHAR(300) NOT NULL,
    secret_ref VARCHAR(200) NOT NULL,
    subscribed_events_json JSONB NOT NULL DEFAULT '[]',
    last_received_at TIMESTAMPTZ,
    error_message VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_webhook_account UNIQUE(integration_account_id)
);
CREATE INDEX idx_webhook_status ON integration_webhook_endpoints(status);

-- ============================================================
-- 11. integration_rate_limit_state
-- ============================================================
CREATE TABLE integration_rate_limit_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE UNIQUE,
    strategy VARCHAR(30) NOT NULL DEFAULT 'NONE',
    state_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12. Seed integration_providers
-- ============================================================
INSERT INTO integration_providers (platform_type, category, display_name, auth_type, capabilities_json, docs_url) VALUES
('META',            'ADS',                'Meta Ads',            'OAUTH2',          '{"supportsAds":true,"supportsPublish":true,"supportsWebhooks":true,"supportsSync":true}',   'https://developers.facebook.com/docs/marketing-apis'),
('GOOGLE_ADS',      'ADS',                'Google Ads',          'OAUTH2',          '{"supportsAds":true,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}',  'https://developers.google.com/google-ads/api/docs/start'),
('TIKTOK',          'ADS',                'TikTok Ads',          'OAUTH2',          '{"supportsAds":true,"supportsPublish":true,"supportsWebhooks":true,"supportsSync":true}',   'https://business-api.tiktok.com/portal/docs'),
('LINKEDIN',        'ADS',                'LinkedIn Ads',        'OAUTH2',          '{"supportsAds":true,"supportsPublish":true,"supportsWebhooks":false,"supportsSync":true}',  'https://learn.microsoft.com/en-us/linkedin/marketing/'),
('X',               'ADS',                'X (Twitter) Ads',     'OAUTH2',          '{"supportsAds":true,"supportsPublish":true,"supportsWebhooks":true,"supportsSync":true}',   'https://developer.x.com/en/docs/x-ads-api'),
('PINTEREST',       'ADS',                'Pinterest Ads',       'OAUTH2',          '{"supportsAds":true,"supportsPublish":true,"supportsWebhooks":false,"supportsSync":true}',  'https://developers.pinterest.com/docs/api/v5/'),
('SNAP',            'ADS',                'Snapchat Ads',        'OAUTH2',          '{"supportsAds":true,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}',  'https://marketingapi.snapchat.com/docs/'),
('CHATGPT_ADS',     'ADS',                'ChatGPT Ads',         'API_KEY',         '{"supportsAds":true,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}',  NULL),
('PERPLEXITY_ADS',  'ADS',                'Perplexity Ads',      'API_KEY',         '{"supportsAds":true,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}',  NULL),
('GA4',             'ANALYTICS',          'Google Analytics 4',  'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}', 'https://developers.google.com/analytics/devguides/reporting/data/v1'),
('GTM',             'ANALYTICS',          'Google Tag Manager',  'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":false}','https://developers.google.com/tag-platform/tag-manager/api/v2'),
('SHOPIFY',         'COMMERCE',           'Shopify',             'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://shopify.dev/docs/api'),
('WOOCOMMERCE',     'COMMERCE',           'WooCommerce',         'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://woocommerce.github.io/woocommerce-rest-api-docs/'),
('HUBSPOT',         'CRM',                'HubSpot',             'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://developers.hubspot.com/docs/api/overview'),
('SALESFORCE',      'CRM',                'Salesforce',          'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/'),
('KLAVIYO',         'CRM',                'Klaviyo',             'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://developers.klaviyo.com/en/reference/api-overview'),
('MAILCHIMP',       'MESSAGING',          'Mailchimp',           'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://mailchimp.com/developer/marketing/api/'),
('TWILIO',          'MESSAGING',          'Twilio',              'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":false}', 'https://www.twilio.com/docs/usage/api'),
('WHATSAPP',        'MESSAGING',          'WhatsApp Business',   'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":false}', 'https://developers.facebook.com/docs/whatsapp/cloud-api/'),
('GOOGLE_DRIVE',    'ASSETS',             'Google Drive',        'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}', 'https://developers.google.com/drive/api/guides/about-sdk'),
('DROPBOX',         'ASSETS',             'Dropbox',             'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://www.dropbox.com/developers/documentation'),
('FIGMA',           'ASSETS',             'Figma',               'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":false}', 'https://www.figma.com/developers/api'),
('CANVA',           'ASSETS',             'Canva',               'OAUTH2',          '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":false}','https://www.canva.dev/docs/connect/'),
('BIGQUERY',        'DATA_WAREHOUSE',     'BigQuery',            'SERVICE_ACCOUNT', '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}', 'https://cloud.google.com/bigquery/docs/reference/rest'),
('SNOWFLAKE',       'DATA_WAREHOUSE',     'Snowflake',           'BASIC',           '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":true}', 'https://docs.snowflake.com/en/developer-guide/sql-api/'),
('SEGMENT',         'CDP',                'Segment',             'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://segment.com/docs/connections/sources/'),
('MPARTICLE',       'CDP',                'mParticle',           'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":true}',  'https://docs.mparticle.com/developers/'),
('CUSTOM',          'OTHER',              'Custom Integration',  'API_KEY',         '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":true,"supportsSync":false}', NULL);

-- ============================================================
-- 13. Backfill integration_accounts with provider_id and connected_by_user_id
-- ============================================================
UPDATE integration_accounts ia
SET provider_id = ip.id
FROM integration_providers ip
WHERE ia.platform_type = ip.platform_type;

UPDATE integration_accounts
SET connected_by_user_id = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
WHERE connected_by_user_id IS NULL;

-- ============================================================
-- 14. Seed OAuth configs for the 6 main OAuth platforms (disabled by default)
-- ============================================================
INSERT INTO platform_oauth_configs (platform_type, client_id, encrypted_client_secret, auth_url, token_url, scopes, redirect_uri, extra_params_json, enabled) VALUES
('META',      'PLACEHOLDER_META_CLIENT_ID',      'PLACEHOLDER', 'https://www.facebook.com/v21.0/dialog/oauth',             'https://graph.facebook.com/v21.0/oauth/access_token',               'ads_read,ads_management,pages_read_engagement',     '/api/v1/oauth/META/callback',      '{}', false),
('GOOGLE_ADS','PLACEHOLDER_GOOGLE_CLIENT_ID',     'PLACEHOLDER', 'https://accounts.google.com/o/oauth2/v2/auth',            'https://oauth2.googleapis.com/token',                               'https://www.googleapis.com/auth/adwords',           '/api/v1/oauth/GOOGLE_ADS/callback','{"access_type":"offline","prompt":"consent"}', false),
('TIKTOK',    'PLACEHOLDER_TIKTOK_CLIENT_ID',     'PLACEHOLDER', 'https://business-api.tiktok.com/portal/auth',             'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/','scope_not_applicable',                              '/api/v1/oauth/TIKTOK/callback',    '{"app_id":"PLACEHOLDER"}', false),
('LINKEDIN',  'PLACEHOLDER_LINKEDIN_CLIENT_ID',   'PLACEHOLDER', 'https://www.linkedin.com/oauth/v2/authorization',         'https://www.linkedin.com/oauth/v2/accessToken',                     'r_ads,r_ads_reporting,r_organization_social',       '/api/v1/oauth/LINKEDIN/callback',  '{}', false),
('PINTEREST', 'PLACEHOLDER_PINTEREST_CLIENT_ID',  'PLACEHOLDER', 'https://www.pinterest.com/oauth/',                        'https://api.pinterest.com/v5/oauth/token',                          'ads:read,boards:read',                              '/api/v1/oauth/PINTEREST/callback', '{}', false),
('SNAP',      'PLACEHOLDER_SNAP_CLIENT_ID',       'PLACEHOLDER', 'https://accounts.snapchat.com/login/oauth2/authorize',    'https://accounts.snapchat.com/login/oauth2/access_token',           'snapchat-marketing-api',                            '/api/v1/oauth/SNAP/callback',      '{}', false);
