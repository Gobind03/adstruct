export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface CampaignResponse {
  id: string;
  workspaceId: string;
  integrationAccountId: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget: number;
  lifetimeBudget: number;
  startDate: string;
  endDate: string;
  pacingMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCreateRequest {
  workspaceId: string;
  integrationAccountId: string;
  name: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startDate?: string;
  endDate?: string;
  pacingMode?: string;
}

export interface IntegrationProviderResponse {
  id: string;
  platformType: string;
  category: string;
  displayName: string;
  authType: string;
  capabilitiesJson: string;
  docsUrl: string;
}

export interface IntegrationAccountResponse {
  id: string;
  orgId: string;
  platformType: string;
  category: string;
  displayName: string;
  status: string;
  authType: string;
  scopesJson: string;
  externalAccountId: string;
  connectedByUserId: string;
  lastValidatedAt: string;
  lastSyncAt: string;
  errorCode: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationAccountCreateRequest {
  platformType: string;
  displayName: string;
  authType: string;
  secretPayload?: Record<string, string>;
  scopesJson?: string;
  externalAccountId?: string;
}

export interface IntegrationResourceResponse {
  id: string;
  integrationAccountId: string;
  resourceType: string;
  externalResourceId: string;
  displayName: string;
  status: string;
  metaJson: string;
  lastDiscoveredAt: string;
  createdAt: string;
}

export interface WorkspaceIntegrationResponse {
  id: string;
  workspaceId: string;
  integrationAccountId: string;
  platformType: string;
  accountDisplayName: string;
  integrationResourceId: string;
  resourceDisplayName: string;
  enabled: boolean;
  isDefault: boolean;
  settingsJson: string;
  createdAt: string;
}

export interface PlatformEntityMappingResponse {
  id: string;
  workspaceId: string;
  integrationAccountId: string;
  resourceId: string;
  internalEntityType: string;
  internalEntityId: string;
  externalEntityType: string;
  externalEntityId: string;
  externalParentId: string;
  mappingStatus: string;
  metaJson: string;
  createdAt: string;
}

export interface SyncJobResponse {
  id: string;
  integrationAccountId: string;
  resourceId: string;
  workspaceId: string;
  syncMode: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  statsJson: string;
  errorMessage: string;
  requestedByUserId: string;
  createdAt: string;
}

export interface WebhookResponse {
  id: string;
  integrationAccountId: string;
  status: string;
  endpointUrl: string;
  signingSecret: string | null;
  subscribedEventsJson: string;
  lastReceivedAt: string;
  errorMessage: string;
  createdAt: string;
}

export interface WebhookDeliveryResponse {
  id: string;
  webhookId: string;
  platformType: string;
  eventType: string;
  status: string;
  rowsProcessed: number;
  errorMessage: string | null;
  receivedAt: string;
}

export interface OAuthConfigResponse {
  id: string;
  platformType: string;
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  redirectUri: string;
  extraParamsJson: string;
  enabled: boolean;
}

export interface HealthSummaryResponse {
  accountId: string;
  platformType: string;
  displayName: string;
  overallStatus: string;
  connectionStatus: string;
  lastValidatedAt: string;
  lastSyncAt: string;
  webhookStatus: string;
  rateLimitStrategy: string;
  warnings: string[];
}

export interface TargetSetResponse {
  id: string;
  campaignId: string;
  intentType: string;
  topicsJson: string;
  geoJson: string;
  negativeTopicsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetSetRequest {
  intentType: string;
  topicsJson?: string;
  geoJson?: string;
  negativeTopicsJson?: string;
}

export interface SponsoredUnitResponse {
  id: string;
  campaignId: string;
  type: string;
  title: string;
  snippet: string;
  ctaText: string;
  landingUrl: string;
  disclaimer: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SponsoredUnitRequest {
  type: string;
  title: string;
  snippet?: string;
  ctaText?: string;
  landingUrl?: string;
  disclaimer?: string;
}

export interface ApprovalResponse {
  id: string;
  entityType: string;
  entityId: string;
  state: string;
  reviewerUserId: string;
  notes: string;
  updatedAt: string;
}

export interface EventSummaryResponse {
  campaignId: string;
  eventType: string;
  count: number;
  date: string;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignReportDataResponse {
  id: string;
  syncJobId: string;
  integrationAccountId: string;
  platformType: string;
  accountDisplayName: string;
  workspaceId: string;
  internalCampaignId: string | null;
  internalCampaignName: string | null;
  externalCampaignId: string;
  campaignName: string;
  campaignStatus: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  conversions: number;
  reportDate: string;
  createdAt: string;
}

export interface CampaignReportSummaryResponse {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  campaignCount: number;
  avgCpc: number;
  avgCtr: number;
}
