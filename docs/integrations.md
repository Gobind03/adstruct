# Integrations Hub

## Overview

The Integrations Hub is a robust, extensible integration layer enabling connections to Ads, Social, Analytics, Commerce, CRM, Messaging, Assets, Data Warehouse, and CDP platforms. It provides clean data models, encrypted secrets management, real OAuth2 flows, batch sync jobs, real-time webhook ingestion, platform entity mappings, campaign report data persistence, and health diagnostics.

## Core Concepts

### Provider
A supported platform/service (e.g., Meta Ads, Google Ads, Shopify). Providers are seeded in the database and describe capabilities, auth type, and documentation links. There are 28 built-in providers.

### Integration Account
A connected account instance (e.g., "Meta Business Manager X"). Accounts are owned at the Organization scope, store encrypted credentials via `SecretStoreRecord`, and track connection status, last validation, and last sync.

### Integration Resource
A discoverable child resource under an account (e.g., Ad Account, Page, Pixel, Property). Resources are discovered via the connector framework and can be individually enabled/disabled.

### Workspace Integration
Maps an Organization-level Integration Account (optionally with a specific Resource) to a Workspace. Each workspace can have one default integration per platform type.

### Platform Entity Mapping
Links internal campaigns to external platform campaign IDs. When a mapping exists:
- **Sync jobs** automatically route report data to the mapped internal campaign and sync campaign status
- **Webhooks** do the same for real-time event data
- **Campaign detail page** shows synced metrics (spend, impressions, clicks, etc.) under a "Synced Metrics" tab

Mappings are created from the **Campaign Reports** page (quick-map), the **Entity Mappings** page (manual), or programmatically via API. Creating a mapping triggers a backfill of all existing report rows for that external campaign.

### Sync Job
Batch data synchronization jobs that pull campaign report data from ad platforms. Jobs follow the lifecycle: `QUEUED → RUNNING → SUCCESS/FAILED/PARTIAL`. Each run:
1. Fetches campaign metrics via the platform connector
2. Persists report rows to `campaign_report_data` via `ReportDataPersistenceService`
3. Resolves entity mappings to link rows to internal campaigns
4. Syncs campaign status to `conversation_campaigns` for mapped campaigns
5. Updates the integration account's `lastSyncAt` timestamp

### Webhook Endpoint
Manages inbound real-time webhooks from ad platforms. Each account can have one webhook endpoint with a signing secret for payload verification. The webhook receive pipeline:
1. Identifies the matching active webhook by account and platform
2. Verifies the payload signature (Meta: HMAC-SHA256 via `X-Hub-Signature-256`; Google: JWT bearer token)
3. Parses platform-specific payloads into `CampaignReportRow` objects via the connector
4. Persists data via the same `ReportDataPersistenceService` used by sync jobs
5. Updates the account's `lastSyncAt` and webhook's `lastReceivedAt`
6. Logs every delivery in the `webhook_deliveries` table

Webhooks can be paused (set to `INACTIVE`) and resumed without deleting the configuration.

## OAuth2 Setup Guide

### Supported OAuth Platforms

| Platform | Auth URL | Token URL | Default Scopes |
|----------|----------|-----------|----------------|
| Meta | `facebook.com/v21.0/dialog/oauth` | `graph.facebook.com/v21.0/oauth/access_token` | `ads_read,ads_management,pages_read_engagement` |
| Google Ads | `accounts.google.com/o/oauth2/v2/auth` | `oauth2.googleapis.com/token` | `adwords` |
| TikTok | `business-api.tiktok.com/portal/auth` | `business-api.tiktok.com/open_api/v1.3/oauth2/access_token/` | N/A |
| LinkedIn | `linkedin.com/oauth/v2/authorization` | `linkedin.com/oauth/v2/accessToken` | `r_ads,r_ads_reporting,r_organization_social` |
| Pinterest | `pinterest.com/oauth/` | `api.pinterest.com/v5/oauth/token` | `ads:read,boards:read` |
| Snapchat | `accounts.snapchat.com/login/oauth2/authorize` | `accounts.snapchat.com/login/oauth2/access_token` | `snapchat-marketing-api` |

### Configuration Steps

1. **Register your app** on each platform's developer portal
2. **Obtain** `client_id` and `client_secret`
3. **Configure redirect URI** as `{your-domain}/api/v1/oauth/{PLATFORM_TYPE}/callback`
4. **Update OAuth Config** via the Admin UI at `/integrations/oauth-configs`:
   - Set the `client_id` and `client_secret`
   - Verify the `redirect_uri` matches your deployment
   - Set `enabled = true`
5. **Connect accounts** from the Providers Catalog or Accounts page

### OAuth Flow

1. User clicks "Connect with {Platform}" in the frontend
2. Frontend calls `GET /api/v1/oauth/{platformType}/authorize?orgId=...`
3. Backend generates a CSRF state token, stores it, builds the authorization URL
4. Frontend opens the authorization URL (popup or redirect)
5. User authorizes on the platform
6. Platform redirects to `GET /api/v1/oauth/{platformType}/callback?code=...&state=...`
7. Backend validates state, exchanges code for tokens, encrypts and stores tokens
8. Backend creates the IntegrationAccount and redirects to the frontend

## Secrets Handling

- All secrets are stored in `secret_store_records` table with AES-GCM encryption
- Access tokens, refresh tokens, and API keys are never returned in API responses
- **Webhook signing secrets** are resolved and returned in the `WebhookResponse` DTO so users can copy them into their ad platform's webhook configuration dashboard
- Secret rotation creates a new encrypted record and deletes the old one
- Token refresh happens automatically when a token is near expiry

## Connector Framework

The connector framework uses an extensible `IntegrationConnector` interface:

```java
public interface IntegrationConnector {
    PlatformType platformType();
    IntegrationCategory category();
    ValidationResult validate(String accessToken);
    List<DiscoveredResource> discoverResources(String accessToken, String externalAccountId);
    List<CampaignReportRow> fetchCampaignReport(String accessToken, ReportRequest request);

    // Webhook support (default no-op implementations)
    default boolean verifyWebhookSignature(String payload, String signature, String secret) { return false; }
    default List<CampaignReportRow> parseWebhookPayload(String payload) { return List.of(); }
}
```

Connectors are registered in `ConnectorRegistry` and resolved by `PlatformType`. Real implementations exist for: Meta, Google Ads, TikTok, LinkedIn, Pinterest, Snapchat, GA4, and ChatGPT Ads.

### Webhook Support in Connectors

Platform connectors implement `verifyWebhookSignature` and `parseWebhookPayload` for real-time data ingestion:

| Platform | Signature Method | Payload Format |
|----------|-----------------|----------------|
| Meta Ads | HMAC-SHA256 (`X-Hub-Signature-256` header, `sha256=<hex>`) | JSON with `entry[].changes[].value` containing campaign fields |
| Google Ads | JWT bearer token in `Authorization` header (Pub/Sub push) | Base64-encoded JSON in `message.data` with campaign change events |

Other connectors use the default no-op implementations and rely on batch sync.

## Platform-Specific Notes

### Meta Ads
- Uses Graph API v21.0
- Token validation: `GET /me`
- Resources: Ad Accounts (`/me/adaccounts`) and Pages (`/me/accounts`)
- Reporting: Insights API with `time_range` and `level=campaign`
- **Webhooks**: Expects `X-Hub-Signature-256` HMAC-SHA256 header; supports verification challenge (`hub.mode=subscribe`)
- **Payload**: `entry[].changes[].value` containing `campaign_id`, `campaign_name`, `spend`, `impressions`, `clicks`, `cpc`, `cpm`, `ctr`, `conversions`, `date_start`

### Google Ads
- Uses Google Ads API v17
- Requires a `developer-token` header (stored in `PlatformOAuthConfig.extra_params_json`)
- Reporting via GAQL (Google Ads Query Language) through `searchStream` endpoint
- Cost is returned in micros (divide by 1,000,000)
- **Webhooks**: Expects Google Cloud Pub/Sub push messages with JWT bearer token in `Authorization` header
- **Payload**: Base64-encoded JSON in `message.data` with `customer_id`, `campaign_id`, `campaign_name`, `status`, `metrics` object

### TikTok Ads
- Uses Business API v1.3
- Auth uses `Access-Token` header (not Bearer)
- Reporting via `/report/integrated/get/` endpoint

### LinkedIn Ads
- Uses versioned REST API with `LinkedIn-Version` header
- Reporting via `/rest/adAnalytics` with URN-based pivot values
- Cost field: `costInLocalCurrency`

### Pinterest Ads
- Uses API v5
- Standard Bearer token auth
- Reporting via `/ad_accounts/{id}/analytics`

### Snapchat Ads
- Uses Marketing API v1
- Discovery: Organizations -> Ad Accounts hierarchy
- Spend returned in micro-currency (divide by 1,000,000)

## Report Data Persistence

The `ReportDataPersistenceService` is a shared service used by both **sync jobs** and **webhooks** to persist campaign report data:

1. **Upsert report rows** into `campaign_report_data` (keyed by account + external campaign + report date)
2. **Resolve entity mappings** — looks up `platform_entity_mappings` to find the linked internal campaign
3. **Link report rows** — sets `internalCampaignId` and `workspaceId` on each row if a mapping exists
4. **Sync campaign status** — updates the internal campaign's status in `conversation_campaigns` when the platform reports a status change

The `sync_job_id` column on `campaign_report_data` is nullable to support webhook-sourced data (which has no sync job).

## Database Tables

| Table | Purpose |
|-------|---------|
| `integration_providers` | Platform catalog (28 seeded) |
| `integration_accounts` | Connected account instances |
| `integration_resources` | Child resources per account |
| `workspace_integrations` | Account-to-workspace mappings |
| `platform_entity_mappings` | Internal-to-external entity mappings |
| `integration_sync_jobs` | Sync job tracking |
| `campaign_report_data` | Synced campaign metrics (from sync jobs and webhooks) |
| `integration_webhook_endpoints` | Inbound webhook configuration and status |
| `webhook_deliveries` | Audit log of every received webhook event |
| `integration_rate_limit_state` | Per-account rate limit tracking |
| `platform_oauth_configs` | OAuth client credentials (admin-managed) |
| `oauth_state_tokens` | CSRF state tokens for OAuth flows |
| `secret_store_records` | Encrypted credential storage |

### Key Schema Notes

- `campaign_report_data.sync_job_id` is nullable — rows from webhooks have no associated sync job
- `campaign_report_data.internal_campaign_id` is nullable — only set when an entity mapping exists
- `webhook_deliveries` tracks event type, status (SUCCESS/FAILED), rows processed, and error messages
- `integration_webhook_endpoints.status` can be `ACTIVE`, `INACTIVE`, or `ERROR`

## Frontend UI Flow

The integration hub frontend pages are interconnected with workflow guides, help tooltips, and cross-links to provide an intuitive user experience.

### Page Map

| Route | Component | Purpose |
|-------|-----------|---------|
| `/integrations` | `IntegrationListComponent` | Overview dashboard with quick links to all sub-pages |
| `/integrations/accounts` | `AccountsListComponent` | Manage connected ad platform accounts |
| `/integrations/sync-jobs` | `SyncJobsComponent` | Create and run batch sync jobs |
| `/integrations/webhooks` | `WebhooksComponent` | Register, pause, and monitor real-time webhooks |
| `/integrations/campaign-reports` | `CampaignPerformanceComponent` | View synced data, quick-map campaigns |
| `/integrations/entity-mappings` | `EntityMappingsComponent` | Create and manage campaign mappings manually |
| `/campaigns/{id}` | `CampaignDetailComponent` | View campaign details + "Synced Metrics" tab |

### Recommended User Workflow

```
1. Connect accounts     →  /integrations/accounts
2. Set up data ingestion:
   a. Sync jobs (batch) →  /integrations/sync-jobs
   b. Webhooks (real-time) → /integrations/webhooks
3. View synced data     →  /integrations/campaign-reports
4. Map external → internal campaigns (quick-map or manual):
   a. Quick-map         →  /integrations/campaign-reports (Map button)
   b. Manual mapping    →  /integrations/entity-mappings
5. View synced metrics  →  /campaigns/{id} → "Synced Metrics" tab
```

### Cross-Page Guidance

Each page includes contextual help to guide users through the workflow:

- **Sync Jobs** page: 3-step workflow guide, footer linking to Campaign Reports and Entity Mappings
- **Webhooks** page: 4-step workflow guide (register → configure platform → data flows → map campaigns), platform-specific setup guides (Meta, Google Ads), delivery log, footer linking to Entity Mappings
- **Campaign Reports** page: 3-step onboarding guide, unmapped campaign highlighting, quick-map button, footer linking to Entity Mappings and campaign detail page
- **Entity Mappings** page: "What are Entity Mappings?" explainer, cross-links back to Sync Jobs, Webhooks, and Campaign Reports, field-level tooltips explaining each input
- **Campaign Detail** page: "Synced Metrics" tab shows linked report data with summary cards; empty state guides users to map the campaign

### Key Frontend Services

| Service | File | Purpose |
|---------|------|---------|
| `CampaignReportApiService` | `campaign-report-api.service.ts` | Fetch report data and summaries |
| `WebhooksApiService` | `webhooks-api.service.ts` | Register, rotate, toggle, list deliveries |
| `EntityMappingsApiService` | `entity-mappings-api.service.ts` | CRUD for platform entity mappings |
| `CampaignService` | `campaign.service.ts` | Campaign CRUD + `getSyncedReports()` |
