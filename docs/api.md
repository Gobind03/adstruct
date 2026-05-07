# Workspace & Account Management API

All endpoints require JWT authentication (`Authorization: Bearer <token>`) unless noted otherwise.
Base URL: `/api/v1`

## Organizations

### List Organizations
```
GET /organizations
```
Returns organizations the current user has membership in.

**Response:** `200 OK`
```json
[
  {
    "id": "a0eebc99-...",
    "name": "Avyukt Digital",
    "timezone": "America/New_York",
    "currency": "USD",
    "status": "ACTIVE",
    "workspaceCount": 2,
    "memberCount": 5,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Organization
```
POST /organizations
```
Any authenticated user can create an org. Creator becomes ORG_ADMIN.

**Request:**
```json
{
  "name": "My Company",
  "timezone": "Asia/Kolkata",
  "currency": "INR"
}
```

**Response:** `201 Created` — same shape as list item.

### Get Organization
```
GET /organizations/{orgId}
```
Requires org membership.

### Update Organization
```
PATCH /organizations/{orgId}
```
Requires ORG_ADMIN. All fields optional (partial update).

**Request:**
```json
{
  "name": "New Name",
  "status": "SUSPENDED"
}
```

---

## Workspaces

### List Workspaces
```
GET /organizations/{orgId}/workspaces?status=ACTIVE&name=US
```
Requires org membership. Filters: `status` (ACTIVE/ARCHIVED), `name` (contains).

**Response:** `200 OK`
```json
[
  {
    "id": "b0eebc99-...",
    "orgId": "a0eebc99-...",
    "name": "US Market",
    "market": "US",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Workspace
```
POST /organizations/{orgId}/workspaces
```
Requires ORG_ADMIN or WORKSPACE_ADMIN. Returns `409` if name duplicate within org.

**Request:**
```json
{ "name": "India Market", "market": "IN" }
```

### Update Workspace
```
PATCH /organizations/{orgId}/workspaces/{workspaceId}
```

### Archive / Restore Workspace
```
POST /organizations/{orgId}/workspaces/{workspaceId}/archive
POST /organizations/{orgId}/workspaces/{workspaceId}/restore
```

---

## Members & Roles

### List Members
```
GET /organizations/{orgId}/members?workspaceId=...&role=EDITOR&status=ACTIVE&query=john
```

**Response:** `200 OK`
```json
[
  {
    "membershipId": "e0eebc99-...",
    "userId": "c0eebc99-...",
    "email": "admin@avyukt.com",
    "fullName": "Admin User",
    "userStatus": "ACTIVE",
    "role": "ORG_ADMIN",
    "orgId": "a0eebc99-...",
    "workspaceId": null,
    "workspaceName": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Add Member
```
POST /organizations/{orgId}/members
```
Creates user (INVITED) if not exists + membership.

**Request:**
```json
{
  "email": "new@example.com",
  "fullName": "New User",
  "role": "EDITOR",
  "workspaceId": "b0eebc99-..."
}
```

### Update Member Role
```
PATCH /organizations/{orgId}/members/{membershipId}
```

**Request:**
```json
{ "role": "ANALYST" }
```

### Remove Member
```
DELETE /organizations/{orgId}/members/{membershipId}
```

---

## Users

### Get Current User Profile
```
GET /users/me
```

**Response:** `200 OK`
```json
{
  "id": "c0eebc99-...",
  "email": "admin@avyukt.com",
  "fullName": "Admin User",
  "status": "ACTIVE",
  "memberships": [
    {
      "id": "e0eebc99-...",
      "userId": "c0eebc99-...",
      "orgId": "a0eebc99-...",
      "workspaceId": null,
      "role": "ORG_ADMIN",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Update Profile
```
PATCH /users/me
```

**Request:**
```json
{ "fullName": "Updated Name" }
```

---

## Invites

### Create Invite
```
POST /organizations/{orgId}/invites
```
Requires ORG_ADMIN or WORKSPACE_ADMIN.

**Request:**
```json
{
  "email": "newguy@example.com",
  "role": "EDITOR",
  "workspaceId": null,
  "expiresInDays": 7
}
```

**Response:** `201 Created`
```json
{
  "id": "...",
  "orgId": "...",
  "email": "newguy@example.com",
  "role": "EDITOR",
  "status": "PENDING",
  "inviteLink": "http://localhost:4200/invite/accept?token=...",
  "expiresAt": "2024-01-08T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Invites
```
GET /organizations/{orgId}/invites?status=PENDING&workspaceId=...
```

### Accept Invite (Public - No Auth)
```
POST /invites/accept
```

**Request:**
```json
{
  "token": "base64-url-encoded-token",
  "fullName": "John Doe",
  "password": "securepassword"
}
```

### Revoke Invite
```
POST /organizations/{orgId}/invites/{inviteId}/revoke
```

### Resend Invite
```
POST /organizations/{orgId}/invites/{inviteId}/resend
```

---

## Teams

### List Teams
```
GET /organizations/{orgId}/teams?workspaceId=...
```

### Create Team
```
POST /organizations/{orgId}/teams
```

**Request:**
```json
{ "name": "Engineering", "workspaceId": "..." }
```

### Get Team
```
GET /organizations/{orgId}/teams/{teamId}
```

### Update Team
```
PATCH /organizations/{orgId}/teams/{teamId}
```

### Delete Team
```
DELETE /organizations/{orgId}/teams/{teamId}
```

### Add Team Member
```
POST /organizations/{orgId}/teams/{teamId}/members
```

**Request:**
```json
{ "userId": "c0eebc99-..." }
```

### Remove Team Member
```
DELETE /organizations/{orgId}/teams/{teamId}/members/{userId}
```

---

## Audit Logs

### List Audit Logs
```
GET /organizations/{orgId}/audit?page=0&size=20&workspaceId=...&entityType=ORGANIZATION&action=CREATE&actorUserId=...&dateFrom=2024-01-01T00:00:00Z&dateTo=2024-12-31T23:59:59Z
```

**Response:** `200 OK` (paged)
```json
{
  "content": [
    {
      "id": "...",
      "orgId": "...",
      "workspaceId": null,
      "actorUserId": "...",
      "action": "CREATE",
      "entityType": "ORGANIZATION",
      "entityId": "...",
      "beforeJson": null,
      "afterJson": "{...}",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "totalElements": 42,
  "totalPages": 3,
  "size": 20,
  "number": 0,
  "last": false
}
```

---

## RBAC Roles

| Role | Scope | Capabilities |
|------|-------|-------------|
| ORG_ADMIN | Org-wide | Full access to org and all workspaces |
| WORKSPACE_ADMIN | Workspace | Full access to assigned workspace |
| EDITOR | Org/Workspace | Read/write resources, cannot manage users |
| APPROVER | Org/Workspace | Approve workflows, read org/workspace/members |
| ANALYST | Org/Workspace | Read-only analytics + org/workspace |
| VIEWER | Org/Workspace | Read-only limited |

---

## Integrations Hub

### Integration Providers

#### List Providers
```
GET /integration-providers?category={category}
```
Returns all supported integration providers, optionally filtered by category.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "platformType": "META",
    "category": "ADS",
    "displayName": "Meta Ads",
    "authType": "OAUTH2",
    "capabilitiesJson": "{\"supportsAds\":true}",
    "docsUrl": "https://..."
  }
]
```

#### Get Provider by Platform
```
GET /integration-providers/{platformType}
```

### Integration Accounts

#### List Accounts
```
GET /orgs/{orgId}/integrations/accounts?platformType=&status=&category=
```

#### Create Account
```
POST /orgs/{orgId}/integrations/accounts
```
**Body:**
```json
{
  "platformType": "CHATGPT_ADS",
  "displayName": "My ChatGPT Ads",
  "authType": "API_KEY",
  "secretPayload": { "apiKey": "sk-..." },
  "scopesJson": "[]",
  "externalAccountId": null
}
```
**Response:** `201 Created` - Returns account without secrets

#### Get Account
```
GET /orgs/{orgId}/integrations/accounts/{accountId}
```

#### Update Account
```
PATCH /orgs/{orgId}/integrations/accounts/{accountId}
```

#### Rotate Secrets
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/secrets/rotate
```
**Body:** `{ "secretPayload": { "apiKey": "new-key" } }`

#### Validate Connection
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/validate
```

#### Disconnect
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/disconnect
```

### OAuth Flow

#### Initiate OAuth
```
GET /oauth/{platformType}/authorize?orgId={orgId}&displayName={name}
```
**Response:** `{ "authUrl": "https://..." }`

#### OAuth Callback (public)
```
GET /oauth/{platformType}/callback?code=...&state=...
```
Redirects to frontend on success.

### Integration Resources

#### List Resources
```
GET /orgs/{orgId}/integrations/accounts/{accountId}/resources
```

#### Discover Resources
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/discover
```

#### Update Resource
```
PATCH /orgs/{orgId}/integrations/resources/{resourceId}
```

### Workspace Integrations

#### List Workspace Integrations
```
GET /workspaces/{workspaceId}/integrations
```

#### Map to Workspace
```
POST /workspaces/{workspaceId}/integrations
```
**Body:** `{ "accountId": "uuid", "resourceId": null, "enabled": true, "isDefault": true, "settingsJson": "{}" }`

#### Update Mapping
```
PATCH /workspaces/{workspaceId}/integrations/{id}
```

#### Set Default
```
POST /workspaces/{workspaceId}/integrations/{id}/set-default
```

#### Remove Mapping
```
DELETE /workspaces/{workspaceId}/integrations/{id}
```

### Platform Entity Mappings

Entity mappings link external ad platform campaigns to internal campaigns. When a mapping exists, sync jobs and webhooks automatically route report data to the correct internal campaign and sync status changes. Creating a mapping also backfills all existing report rows for that external campaign.

#### Get by Internal Entity
```
GET /workspaces/{workspaceId}/mappings/internal?internalEntityType=CAMPAIGN&internalEntityId=uuid
```
Returns all external entities linked to a specific internal campaign.

#### Get by External Entity
```
GET /workspaces/{workspaceId}/mappings/external?accountId=uuid&externalEntityType=CAMPAIGN&externalEntityId=12345
```
Returns which internal campaign an external platform campaign is linked to.

#### Create Mapping
```
POST /workspaces/{workspaceId}/mappings
```
**Body:**
```json
{
  "accountId": "uuid",
  "resourceId": null,
  "internalEntityType": "CAMPAIGN",
  "internalEntityId": "uuid",
  "externalEntityType": "CAMPAIGN",
  "externalEntityId": "23851234567890"
}
```
The `accountId` field also accepts `integrationAccountId` as an alias. `resourceId` is optional. On success, existing report rows for this external campaign are backfilled with the internal campaign link.

**Response:** `201 Created`

#### Delete Mapping
```
DELETE /workspaces/{workspaceId}/mappings/{mappingId}
```
Future syncs will no longer link data to the internal campaign. Existing report data retains the link until overwritten.

### Sync Jobs

Sync jobs pull campaign report data from ad platforms in batch. Each run fetches campaign metrics, persists them to `campaign_report_data`, resolves entity mappings to link data to internal campaigns, and syncs campaign status.

#### List Jobs
```
GET /orgs/{orgId}/integrations/sync-jobs?accountId=&workspaceId=&status=
```
**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "accountId": "uuid",
    "platformType": "META",
    "status": "SUCCESS",
    "mode": "FULL",
    "recordsFetched": 25,
    "statsJson": "{\"campaigns\":12,\"totalSpend\":5250.00}",
    "errorMessage": null,
    "startedAt": "2026-03-22T10:00:00Z",
    "completedAt": "2026-03-22T10:01:30Z",
    "createdAt": "2026-03-22T09:59:00Z"
  }
]
```

#### Create Job
```
POST /orgs/{orgId}/integrations/sync-jobs
```
**Body:** `{ "accountId": "uuid", "mode": "FULL" }`

#### Run Job
```
POST /orgs/{orgId}/integrations/sync-jobs/{jobId}/run
```
Triggers execution immediately. Job moves through `QUEUED → RUNNING → SUCCESS/FAILED/PARTIAL`. Data is persisted via `ReportDataPersistenceService` (shared with webhook ingestion).

### Campaign Reports

#### List Report Data
```
GET /orgs/{orgId}/integrations/campaign-reports?accountId=&from=2026-01-01&to=2026-03-22&mapped=true
```
Returns synced campaign report rows. `mapped` filter: `true` = only mapped, `false` = only unmapped, omit = all.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "syncJobId": "uuid or null",
    "integrationAccountId": "uuid",
    "platformType": "META",
    "accountDisplayName": "My Meta Account",
    "workspaceId": "uuid or null",
    "internalCampaignId": "uuid or null",
    "internalCampaignName": "Spring Sale or null",
    "externalCampaignId": "23851234567890",
    "campaignName": "Meta Spring Campaign",
    "campaignStatus": "ACTIVE",
    "spend": 150.50,
    "impressions": 25000,
    "clicks": 1200,
    "cpc": 0.1254,
    "cpm": 6.0200,
    "ctr": 0.048000,
    "conversions": 45,
    "reportDate": "2026-03-21",
    "createdAt": "2026-03-22T00:00:00Z"
  }
]
```

#### Get Report Summary
```
GET /orgs/{orgId}/integrations/campaign-reports/summary?accountId=&from=&to=
```
Returns aggregated totals.

**Response:** `200 OK`
```json
{
  "totalSpend": 5250.00,
  "totalImpressions": 850000,
  "totalClicks": 42000,
  "totalConversions": 1500,
  "campaignCount": 12,
  "avgCpc": 0.1250,
  "avgCtr": 0.049412
}
```

### Synced Reports (Campaign Detail)

#### Get Synced Reports for Internal Campaign
```
GET /campaigns/{campaignId}/synced-reports
```
Returns all campaign report data linked to an internal campaign via entity mappings. Used by the campaign detail "Synced Metrics" tab.

**Response:** `200 OK` — same shape as campaign report list items.

### Webhooks

#### Get Webhook
```
GET /orgs/{orgId}/integrations/accounts/{accountId}/webhook
```
Returns webhook configuration including the signing secret.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "integrationAccountId": "uuid",
  "status": "ACTIVE",
  "endpointUrl": "/api/v1/webhooks/META/receive",
  "signingSecret": "whsec_...",
  "subscribedEventsJson": "[]",
  "lastReceivedAt": "2026-03-22T10:00:00Z",
  "errorMessage": null,
  "createdAt": "2026-03-20T00:00:00Z"
}
```

#### Register Webhook
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/webhook/register
```
**Body:** `{ "subscribedEventsJson": "[]" }` (optional)

**Response:** `201 Created` — same shape as get webhook.

#### Rotate Webhook Secret
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/webhook/rotate-secret
```
Generates a new signing secret. Update the secret in your ad platform's dashboard after rotating.

#### Toggle Webhook Status (Pause/Resume)
```
POST /orgs/{orgId}/integrations/accounts/{accountId}/webhook/toggle-status
```
Toggles between `ACTIVE` and `INACTIVE`. When inactive, incoming events are ignored.

#### List Webhook Deliveries
```
GET /orgs/{orgId}/integrations/webhooks/deliveries
```
Returns the 50 most recent webhook deliveries across all accounts in the organization.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "webhookId": "uuid",
    "platformType": "META",
    "eventType": "campaign_update",
    "status": "SUCCESS",
    "rowsProcessed": 3,
    "errorMessage": null,
    "receivedAt": "2026-03-22T10:00:00Z"
  }
]
```

#### Webhook Verification Challenge (Meta)
```
GET /webhooks/{platformType}/receive?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
```
Public endpoint. Returns the `hub.challenge` value for Meta webhook verification.

#### Receive Webhook (public)
```
POST /webhooks/{platformType}/receive
```
Public endpoint. Accepts webhook payloads from ad platforms. Verifies signatures (Meta: `X-Hub-Signature-256`, Google: `Authorization` bearer token), parses campaign data, persists via `ReportDataPersistenceService`, and logs the delivery.

### Health

#### Get Account Health
```
GET /orgs/{orgId}/integrations/accounts/{accountId}/health
```
**Response:**
```json
{
  "accountId": "uuid",
  "platformType": "META",
  "overallStatus": "HEALTHY",
  "connectionStatus": "CONNECTED",
  "webhookStatus": "ACTIVE",
  "warnings": [],
  "lastValidatedAt": "2026-03-22T00:00:00Z",
  "lastSyncAt": "2026-03-22T00:00:00Z"
}
```

### OAuth Configs (Admin)

#### List OAuth Configs
```
GET /admin/oauth-configs
```
Requires `ORG_ADMIN` role.

#### Update OAuth Config
```
PATCH /admin/oauth-configs/{id}
```
**Body:** `{ "clientId": "...", "clientSecret": "...", "enabled": true }`

---

## Brand & Content Governance

### Brand Profiles

#### Get Org Brand Profile
```
GET /orgs/{orgId}/brand-profile
```
**Response:** `200 OK`
```json
{
  "id": "uuid",
  "orgId": "uuid",
  "displayName": "Avyukt Brand",
  "status": "ACTIVE",
  "primaryColor": "#FF5733",
  "secondaryColor": "#3366FF",
  "accentColor": null,
  "fontPrimary": "Inter",
  "fontSecondary": null,
  "logoAssetId": null,
  "voiceTone": "PROFESSIONAL",
  "voiceGuidelinesText": "Speak with authority...",
  "doListText": "Use active voice\nBe concise",
  "dontListText": "No jargon\nNo superlatives",
  "defaultLanguage": "en",
  "supportedLanguages": "[\"en\",\"en-IN\"]",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

#### Create Default Org Brand Profile
```
POST /orgs/{orgId}/brand-profile
```
Requires ORG_ADMIN.

#### Patch Org Brand Profile
```
PATCH /orgs/{orgId}/brand-profile
```
Requires ORG_ADMIN. All fields optional.

**Request:**
```json
{
  "primaryColor": "#FF5733",
  "voiceTone": "FRIENDLY",
  "defaultLanguage": "en-IN"
}
```

#### Get Effective Workspace Profile
```
GET /workspaces/{workspaceId}/brand-profile/effective
```
Merges org base profile with workspace overrides.

#### Init Workspace Brand Profile
```
POST /workspaces/{workspaceId}/brand-profile/init
```

#### Patch Workspace Overrides
```
PATCH /workspaces/{workspaceId}/brand-profile/overrides
```
**Request:**
```json
{
  "overridesJson": "{\"voiceTone\":\"PREMIUM\",\"defaultLanguage\":\"en-IN\"}"
}
```

### Brand Assets

#### List Assets
```
GET /orgs/{orgId}/brand-assets?workspaceId=&status=ACTIVE
```

#### Register Asset
```
POST /orgs/{orgId}/brand-assets
```
**Request:**
```json
{
  "scope": "ORG",
  "name": "Primary Logo",
  "assetType": "LOGO",
  "fileUrl": "https://cdn.example.com/logo.png",
  "mimeType": "image/png",
  "width": 512,
  "height": 512
}
```

### Rule Sets & Rules

#### List Rule Sets
```
GET /orgs/{orgId}/rulesets?workspaceId=&status=
```

#### Create Rule Set
```
POST /orgs/{orgId}/rulesets
```
**Request:**
```json
{
  "scope": "ORG",
  "name": "Financial Compliance",
  "domain": "FINANCE",
  "description": "Rules for financial ad copy"
}
```

#### Clone to Workspace
```
POST /orgs/{orgId}/rulesets/{ruleSetId}/clone-to-workspace?workspaceId=uuid
```

#### List Rules
```
GET /rulesets/{ruleSetId}/rules
```

#### Create Rule
```
POST /rulesets/{ruleSetId}/rules
```
**Request:**
```json
{
  "ruleType": "BANNED_PHRASE",
  "severity": "BLOCK",
  "name": "No guaranteed returns",
  "pattern": "guaranteed returns"
}
```

### Disclaimers

#### List Disclaimers
```
GET /orgs/{orgId}/disclaimers?workspaceId=&status=
```

#### Create Disclaimer
```
POST /orgs/{orgId}/disclaimers
```
**Request:**
```json
{
  "scope": "ORG",
  "key": "FINANCE_RISK",
  "title": "Financial Risk Disclaimer",
  "defaultText": "Investments carry risk. Past performance is not indicative of future results."
}
```

#### Add Localization
```
POST /orgs/{orgId}/disclaimers/{disclaimerId}/localizations
```
**Request:**
```json
{ "language": "hi", "text": "निवेश में जोखिम होता है।" }
```

### Templates

#### List Templates
```
GET /orgs/{orgId}/templates?workspaceId=&type=AD_COPY&status=DRAFT
```

#### Create Draft Template
```
POST /orgs/{orgId}/templates
```
Requires EDITOR, WORKSPACE_ADMIN, or ORG_ADMIN.

**Request:**
```json
{
  "scope": "ORG",
  "templateType": "AD_COPY",
  "name": "Spring Promo",
  "contentJson": "{\"headline\":\"Spring Sale!\",\"primaryText\":\"Save 20% today\",\"ctaOptions\":[\"Shop Now\"]}",
  "ruleSetId": "uuid",
  "defaultDisclaimerIds": "[\"uuid\"]"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "status": "DRAFT",
  "version": 1,
  "parentTemplateId": null,
  "..."
}
```

#### Submit for Review
```
POST /orgs/{orgId}/templates/{templateId}/submit
```
Moves status DRAFT -> IN_REVIEW and creates ApprovalWorkflow row.

#### Approve Template
```
POST /orgs/{orgId}/templates/{templateId}/approve
```
Requires APPROVER or admin. Moves IN_REVIEW -> APPROVED.

#### Reject Template
```
POST /orgs/{orgId}/templates/{templateId}/reject
```

#### Create New Version
```
POST /orgs/{orgId}/templates/{templateId}/new-version
```
Clones APPROVED template with version+1 and parentTemplateId link, status=DRAFT.

#### Record Usage
```
POST /orgs/{orgId}/templates/{templateId}/record-usage
```
**Request:**
```json
{
  "workspaceId": "uuid",
  "usedInEntityType": "SPONSORED_UNIT",
  "usedInEntityId": "uuid"
}
```

### Governance Checks

#### Run Check
```
POST /workspaces/{workspaceId}/governance/check
```
Deterministic rule evaluation (no LLM). Returns findings with severity aggregation.

**Request:**
```json
{
  "entityType": "SPONSORED_UNIT",
  "entityId": "uuid",
  "contentPayloadJson": "{\"headline\":\"Invest now for guaranteed returns!\"}",
  "ruleSetId": "uuid",
  "platformType": "X",
  "language": "en"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "status": "FAIL",
  "findingsJson": "[{\"severity\":\"BLOCK\",\"ruleId\":\"uuid\",\"message\":\"No guaranteed returns\",\"evidence\":\"Contains banned phrase: \\\"guaranteed returns\\\"\",\"suggestion\":\"Remove or rephrase the banned content\"}]",
  "..."
}
```

#### List Check Runs
```
GET /workspaces/{workspaceId}/governance/checks?entityType=SPONSORED_UNIT&entityId=uuid
```

#### Get Check Run
```
GET /workspaces/{workspaceId}/governance/checks/{checkRunId}
```

### Platform Constraints (Read-only)

#### List Constraints
```
GET /platform-constraints?platformType=X
```
**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "platformType": "X",
    "constraintType": "TEXT_LENGTH",
    "valueJson": "{\"maxLength\": 280}",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

## AI Platform API

Base path prefix: `/api/v1`. All routes below require JWT unless noted. Path parameters `{orgId}`, `{workspaceId}`, `{conversationId}`, etc. are UUIDs.

### AiConversationsController — `/workspaces/{workspaceId}/ai/conversations`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/ai/conversations` | List conversations for the workspace (most recently updated first). |
| POST | `/workspaces/{workspaceId}/ai/conversations` | Create a conversation (title, `agentMode`, optional provider/model/context). |
| GET | `/workspaces/{workspaceId}/ai/conversations/{conversationId}` | Get conversation metadata and ordered messages (with citations). |
| POST | `/workspaces/{workspaceId}/ai/conversations/{conversationId}/messages` | Append a user message; runs agent turn and returns assistant message, tool calls for that turn, and citations. |
| POST | `/workspaces/{workspaceId}/ai/conversations/{conversationId}/archive` | Archive the conversation. |

### AiPromptTemplatesController — `/orgs/{orgId}/ai/prompts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orgs/{orgId}/ai/prompts` | List prompt templates; query params: `scope`, `workspaceId`, `purpose`, `status`, `tag`. |
| POST | `/orgs/{orgId}/ai/prompts` | Create a prompt template. |
| GET | `/orgs/{orgId}/ai/prompts/{promptId}` | Get one template by id. |
| PATCH | `/orgs/{orgId}/ai/prompts/{promptId}` | Partial update (name, prompts, tags, purpose, output format, etc.). |
| POST | `/orgs/{orgId}/ai/prompts/{promptId}/submit` | Submit draft for approval workflow. |
| POST | `/orgs/{orgId}/ai/prompts/{promptId}/approve` | Approve template (elevated org AI management permission). |
| POST | `/orgs/{orgId}/ai/prompts/{promptId}/archive` | Archive template. |
| POST | `/orgs/{orgId}/ai/prompts/{promptId}/run?workspaceId={uuid}` | Execute approved template in a workspace with run request body (input JSON, optional overrides). |

### AiWorkflowsController — `/orgs/{orgId}/ai/workflows`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orgs/{orgId}/ai/workflows` | List workflow definitions; query: `scope`, `workspaceId`, `status`. |
| POST | `/orgs/{orgId}/ai/workflows` | Create workflow definition (`stepsJson`, scope, optional workspace). |
| POST | `/orgs/{orgId}/ai/workflows/{workflowId}/run?workspaceId={uuid}` | Run workflow in workspace with run request payload. |

### AiToolsController — `/workspaces/{workspaceId}/ai/tools`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/ai/tools` | List tool definitions available for the workspace agent. |

### AiActionProposalsController — `/workspaces/{workspaceId}/ai/action-proposals`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/ai/action-proposals` | List proposals; optional query `status` (`PROPOSED`, `APPROVED`, etc.). |
| GET | `/workspaces/{workspaceId}/ai/action-proposals/{proposalId}` | Get one proposal. |
| POST | `/workspaces/{workspaceId}/ai/action-proposals/{proposalId}/submit` | Move proposal along submit path. |
| POST | `/workspaces/{workspaceId}/ai/action-proposals/{proposalId}/approve` | Approve (optional body: review notes string). |
| POST | `/workspaces/{workspaceId}/ai/action-proposals/{proposalId}/reject` | Reject (optional body: notes string). |
| POST | `/workspaces/{workspaceId}/ai/action-proposals/{proposalId}/execute` | Execute approved proposal (executor permission). |

### AiProvidersController — `/orgs/{orgId}/ai/providers`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/orgs/{orgId}/ai/providers` | List **enabled** provider configs for the organization. |
| POST | `/orgs/{orgId}/ai/providers` | Create provider config (integration account, type, defaults). |
| PATCH | `/orgs/{orgId}/ai/providers/{providerConfigId}` | Patch model, timeouts, tokens, temperature, enabled flag, endpoint URL. |
| POST | `/orgs/{orgId}/ai/providers/{providerConfigId}/disable` | Disable provider config. |

### AiWorkspacePreferencesController — `/workspaces/{workspaceId}/ai/provider-preferences`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/ai/provider-preferences` | List workspace-level provider preferences. |
| POST | `/workspaces/{workspaceId}/ai/provider-preferences` | Create preference (provider config link, default flag, allowed models, policy JSON). |
| PATCH | `/workspaces/{workspaceId}/ai/provider-preferences/{prefId}` | Update preference. |
| POST | `/workspaces/{workspaceId}/ai/provider-preferences/{prefId}/set-default` | Mark preference as default for the workspace. |

### AiSafetyController — `/workspaces/{workspaceId}/ai/safety`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/ai/safety/policy` | Get workspace AI safety policy JSON document. |
| PATCH | `/workspaces/{workspaceId}/ai/safety/policy` | Update `policyJson` (content policy including allowed tools list semantics used by UI). |
| GET | `/workspaces/{workspaceId}/ai/safety/redaction-rules` | List custom redaction rules. |
| POST | `/workspaces/{workspaceId}/ai/safety/redaction-rules` | Create redaction rule (regex pattern, replacement, enabled). |
| PATCH | `/workspaces/{workspaceId}/ai/safety/redaction-rules/{ruleId}` | Update rule. |
| DELETE | `/workspaces/{workspaceId}/ai/safety/redaction-rules/{ruleId}` | Delete rule. |

### AiRewriteController (Governance) — `/workspaces/{workspaceId}/governance/ai`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/workspaces/{workspaceId}/governance/ai/rewrite` | Run AI-assisted copy rewrite using org/workspace governance context (separate from prompt template CRUD). |

For architecture and extension points (gateways, `AiFacade`, safety), see [ai.md](ai.md).

---

## Research & Intelligence API

Base path: `/api/v1/workspaces/{workspaceId}/research`. All routes require JWT (`Authorization: Bearer <token>`). Replace `{workspaceId}` with a UUID.

Full conceptual and RBAC detail: [research.md](research.md). Prompt JSON schemas: [prompts/research.md](prompts/research.md).

### Endpoint index

| Area | Method | Path |
|------|--------|------|
| Competitors | GET | `/research/competitors` |
| | GET | `/research/competitors/{competitorId}` |
| | POST | `/research/competitors` |
| | PATCH | `/research/competitors/{competitorId}` |
| | DELETE | `/research/competitors/{competitorId}` |
| | GET, POST | `/research/competitors/{competitorId}/handles` |
| | DELETE | `/research/competitors/{competitorId}/handles/{handleId}` |
| Sources | GET | `/research/sources` |
| | GET | `/research/sources/{sourceId}` |
| | POST | `/research/sources` |
| | PATCH | `/research/sources/{sourceId}` |
| | DELETE | `/research/sources/{sourceId}` |
| Snapshots | GET | `/research/snapshots` |
| | GET | `/research/snapshots/{snapshotId}` |
| | POST | `/research/snapshots` |
| | DELETE | `/research/snapshots/{snapshotId}` |
| Ingest | POST | `/research/ingest/url` |
| | POST | `/research/ingest/file` |
| Watchlists | GET | `/research/watchlists` |
| | GET | `/research/watchlists/{watchlistId}` |
| | POST | `/research/watchlists` |
| | PATCH | `/research/watchlists/{watchlistId}` |
| | DELETE | `/research/watchlists/{watchlistId}` |
| | POST | `/research/watchlists/{watchlistId}/refresh` |
| Jobs | GET | `/research/jobs` |
| | GET | `/research/jobs/{jobId}` |
| Insights | GET | `/research/insights` |
| | GET | `/research/insights/{insightId}` |
| | POST | `/research/insights` |
| | PATCH | `/research/insights/{insightId}` |
| | DELETE | `/research/insights/{insightId}` |
| | POST | `/research/insights/{insightId}/publish` |
| | POST | `/research/insights/{insightId}/archive` |
| | GET, POST | `/research/insights/{insightId}/evidence` |
| | DELETE | `/research/insights/{insightId}/evidence/{evidenceId}` |
| Keyword clusters | GET | `/research/keyword-clusters` |
| | GET | `/research/keyword-clusters/{clusterId}` |
| | POST | `/research/keyword-clusters` |
| | PATCH | `/research/keyword-clusters/{clusterId}` |
| | DELETE | `/research/keyword-clusters/{clusterId}` |
| Personas | GET | `/research/personas` |
| | GET | `/research/personas/{personaId}` |
| | POST | `/research/personas` |
| | PATCH | `/research/personas/{personaId}` |
| | DELETE | `/research/personas/{personaId}` |
| Digests | GET | `/research/digests` |
| | GET | `/research/digests/{digestId}` |
| Cross-module links | GET | `/research/links` |
| | POST | `/research/links` |
| | DELETE | `/research/links/{linkId}` |
| AI | POST | `/research/ai/snapshots/{snapshotId}/summarize` |
| | POST | `/research/ai/competitors/{competitorId}/extract` |
| | POST | `/research/ai/keywords/cluster` |
| | POST | `/research/ai/personas/draft` |
| | POST | `/research/ai/digest/run` |
| | GET | `/research/ai/links` |

Query parameters (where supported): insights — `status`, `category`, `competitorId`; sources — `sourceType`; competitors — `status`; research links — `researchEntityType`, `researchEntityId`, `linkedEntityType`, `linkedEntityId`; AI links — `producedEntityType`, `producedEntityId`.

### Example: create competitor

**Request:** `POST /api/v1/workspaces/{workspaceId}/research/competitors`

```json
{
  "name": "Acme Analytics",
  "websiteUrl": "https://acme.example",
  "description": "Product analytics competitor",
  "categoryTags": ["B2B", "analytics"]
}
```

**Response:** `201 Created`

```json
{
  "id": "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "workspaceId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "name": "Acme Analytics",
  "websiteUrl": "https://acme.example",
  "description": "Product analytics competitor",
  "categoryTags": ["B2B", "analytics"],
  "status": "ACTIVE",
  "createdByUserId": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "createdAt": "2026-03-31T12:00:00Z",
  "updatedAt": "2026-03-31T12:00:00Z"
}
```

### Example: ingest URL

**Request:** `POST /api/v1/workspaces/{workspaceId}/research/ingest/url`

```json
{
  "title": "Acme pricing page",
  "url": "https://acme.example/pricing",
  "snapshotType": "WEB_PAGE",
  "competitorId": "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "rawText": "Pro $99/mo. Enterprise: contact sales.",
  "summaryText": null,
  "metaJson": { "capturedBy": "manual" }
}
```

**Response:** `201 Created`

```json
{
  "sourceId": "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "snapshotId": "a1111111-1111-4111-8111-111111111111",
  "jobId": "j0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
}
```

### Example: AI summarize snapshot

**Request:** `POST /api/v1/workspaces/{workspaceId}/research/ai/snapshots/{snapshotId}/summarize`

```json
{
  "language": "en",
  "providerOverride": null,
  "modelOverride": null
}
```

**Response:** `200 OK`

```json
{
  "snapshotId": "a1111111-1111-4111-8111-111111111111",
  "summary": "Pricing lists Pro at $99/mo and Enterprise via sales.",
  "keyPoints": ["Pro plan $99/mo", "Enterprise sales-led"],
  "entities": ["Pro", "Enterprise"],
  "sentiment": "NEUTRAL",
  "runId": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "aiLinkId": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55"
}
```

The snapshot record is updated with the new summary (and related fields) after a successful run.

### Example: AI extract competitor insights

**Request:** `POST /api/v1/workspaces/{workspaceId}/research/ai/competitors/{competitorId}/extract`

```json
{
  "snapshotIds": [
    "a1111111-1111-4111-8111-111111111111",
    "a2222222-2222-4222-8222-222222222222"
  ],
  "insightTypes": ["COMPETITOR_OFFER", "COMPETITOR_PRICING"],
  "language": "en"
}
```

**Response:** `200 OK`

```json
{
  "createdInsightIds": ["b3333333-3333-4333-8333-333333333333"],
  "runId": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "aiLinkIds": ["e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55"]
}
```

Snapshots must belong to the workspace and their sources must reference the same `competitorId`. Created insights are drafts; add or verify **evidence** before calling `POST .../insights/{id}/publish` (requires admin role; at least one evidence row required).

---

## Creative Studio API

Base path: `/api/v1/workspaces/{workspaceId}/creative` (JWT required). Replace `{workspaceId}` with a UUID. Conceptual and RBAC detail: [creative.md](creative.md). Prompt JSON schemas: [prompts/creative.md](prompts/creative.md).

### Assets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/creative/assets` | List assets (query: `type`, `status`, `q`, pagination `page`/`size`). |
| POST | `/workspaces/{workspaceId}/creative/assets` | Create asset. Requires creative management role. |
| GET | `/workspaces/{workspaceId}/creative/assets/{assetId}` | Get one asset. |
| PATCH | `/workspaces/{workspaceId}/creative/assets/{assetId}` | Partial update. |
| POST | `/workspaces/{workspaceId}/creative/assets/{assetId}/archive` | Set asset to archived status. |
| GET | `/workspaces/{workspaceId}/creative/assets/{assetId}/versions` | List versions. |
| POST | `/workspaces/{workspaceId}/creative/assets/{assetId}/versions` | Add a new version. |

### Copy artifacts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/creative/copy` | List copy (query: `type`, `status`, `language`, `q`, pagination). |
| POST | `/workspaces/{workspaceId}/creative/copy` | Create copy artifact. |
| GET | `/workspaces/{workspaceId}/creative/copy/{copyId}` | Get one artifact. |
| PATCH | `/workspaces/{workspaceId}/creative/copy/{copyId}` | Update artifact. |
| POST | `/workspaces/{workspaceId}/creative/copy/{copyId}/archive` | Archive artifact. |
| POST | `/workspaces/{workspaceId}/creative/copy/{copyId}/governance-check` | Run governance check. **Body:** `{ "platformType": "META", "language": "en" }`. Updates `governanceCheckRunId` on the artifact. |

### Variant sets and variants

Base: `/api/v1/workspaces/{workspaceId}/creative/variant-sets`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create variant set. |
| GET | `/` | List sets (query: `parentEntityType`, `parentEntityId`). |
| GET | `/{variantSetId}` | Get one set. |
| POST | `/{variantSetId}/variants` | Add variant row. |
| GET | `/{variantSetId}/variants` | List variants in set. |

### Usage

| Method | Path | Description |
|--------|------|-------------|
| POST | `/workspaces/{workspaceId}/creative/usage` | Record usage (`creativeEntityType`/`Id` ↔ `usedEntityType`/`Id`). |
| GET | `/workspaces/{workspaceId}/creative/usage` | List usages. **Either** `creativeEntityType` + `creativeEntityId` **or** `usedEntityType` + `usedEntityId` (not both). |

### Links

| Method | Path | Description |
|--------|------|-------------|
| POST | `/workspaces/{workspaceId}/creative/links` | Create link between two entities. |
| GET | `/workspaces/{workspaceId}/creative/links` | List links. **Either** `fromEntityType` + `fromEntityId` **or** `toEntityType` + `toEntityId`. |
| DELETE | `/workspaces/{workspaceId}/creative/links/{linkId}` | Delete link. |

### AI generation and provenance

Base: `/api/v1/workspaces/{workspaceId}/creative/ai`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/copy/generate` | Generate ad copy variants; creates artifacts, variant set, optional governance per variant. **Permission:** creative AI use. |
| POST | `/copy/hooks-angles-ctas` | Generate hooks, angles, CTAs as three copy artifacts. |
| POST | `/copy/video-script` | Generate video script artifact. |
| POST | `/copy/ugc-brief` | Generate UGC brief artifact. |
| POST | `/assets/{assetId}/enrich` | Enrich metadata via AI; returns action proposal id + run id. **Body:** `{ "platformType": "...", "language": "en" }` (fields optional). |
| GET | `/links` | List `CreativeAiRunLink` rows (optional: `producedEntityType`, `producedEntityId`). |

### Render presets

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/creative/render-presets` | List presets for workspace. |
| POST | `/workspaces/{workspaceId}/creative/render-presets` | Create preset (`preset` enum name + optional `constraintsJson`). |
| PATCH | `/workspaces/{workspaceId}/creative/render-presets/{presetId}` | Update `constraintsJson`. |

### Folders and asset mapping

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workspaces/{workspaceId}/creative/folders` | List folders. |
| POST | `/workspaces/{workspaceId}/creative/folders` | Create folder (`name`, optional `parentFolderId`). |
| PATCH | `/workspaces/{workspaceId}/creative/folders/{folderId}` | Rename folder (`name` query param **or** JSON body `{ "name": "..." }`). |
| DELETE | `/workspaces/{workspaceId}/creative/folders/{folderId}` | Delete folder. |
| GET | `/workspaces/{workspaceId}/creative/folders/{folderId}/assets` | List assets in folder. |
| POST | `/workspaces/{workspaceId}/creative/folders/{folderId}/assets/{assetId}` | Map asset to folder. |
| DELETE | `/workspaces/{workspaceId}/creative/folders/{folderId}/assets/{assetId}` | Remove asset from folder. |
