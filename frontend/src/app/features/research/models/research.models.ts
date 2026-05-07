// === Competitor ===
export interface CompetitorResponse {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string | null;
  description: string | null;
  categoryTags: string[];
  status: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface CompetitorCreateRequest {
  name: string;
  websiteUrl?: string;
  description?: string;
  categoryTags?: string[];
}
export interface CompetitorPatchRequest {
  name?: string;
  websiteUrl?: string;
  description?: string;
  categoryTags?: string[];
  status?: string;
}
export interface HandleResponse {
  id: string;
  competitorId: string;
  platformType: string;
  handle: string;
  url: string | null;
  createdAt: string;
}
export interface HandleCreateRequest {
  platformType: string;
  handle: string;
  url?: string;
}

// === Source ===
export interface SourceResponse {
  id: string;
  workspaceId: string;
  sourceType: string;
  title: string;
  url: string | null;
  competitorId: string | null;
  integrationAccountId: string | null;
  integrationResourceId: string | null;
  fileUrl: string | null;
  noteText: string | null;
  metaJson: Record<string, any>;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface SourceCreateRequest {
  sourceType: string;
  title: string;
  url?: string;
  competitorId?: string;
  integrationAccountId?: string;
  integrationResourceId?: string;
  fileUrl?: string;
  noteText?: string;
  metaJson?: Record<string, any>;
}

// === Snapshot ===
export interface SnapshotResponse {
  id: string;
  workspaceId: string;
  sourceId: string;
  snapshotType: string;
  capturedAt: string;
  contentHash: string | null;
  title: string | null;
  summaryText: string | null;
  rawText: string | null;
  rawJson: Record<string, any> | null;
  sentiment: string | null;
  tags: string[];
  createdByUserId: string;
  createdAt: string;
}
export interface SnapshotCreateRequest {
  snapshotType: string;
  sourceId: string;
  title?: string;
  summaryText?: string;
  rawText?: string;
  rawJson?: Record<string, any>;
  sentiment?: string;
  tags?: string[];
}

// === Insight ===
export interface InsightResponse {
  id: string;
  workspaceId: string;
  category: string;
  insightType: string;
  title: string;
  summary: string | null;
  detailsJson: Record<string, any>;
  confidence: string;
  status: string;
  competitorId: string | null;
  relatedKeywords: string[];
  relatedTopics: string[];
  language: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
}
export interface InsightCreateRequest {
  category: string;
  insightType: string;
  title: string;
  summary?: string;
  detailsJson?: Record<string, any>;
  confidence?: string;
  competitorId?: string;
  relatedKeywords?: string[];
  relatedTopics?: string[];
  language?: string;
}
export interface InsightPatchRequest {
  title?: string;
  summary?: string;
  detailsJson?: Record<string, any>;
  confidence?: string;
  status?: string;
  relatedKeywords?: string[];
  relatedTopics?: string[];
  language?: string;
}

// === Evidence ===
export interface EvidenceResponse {
  id: string;
  insightId: string;
  snapshotId: string;
  citationText: string | null;
  citationUrl: string | null;
  evidenceJson: Record<string, any>;
  createdAt: string;
}
export interface EvidenceCreateRequest {
  snapshotId: string;
  citationText?: string;
  citationUrl?: string;
  evidenceJson?: Record<string, any>;
}

// === KeywordCluster ===
export interface KeywordClusterResponse {
  id: string;
  workspaceId: string;
  name: string;
  intentType: string | null;
  keywords: string[];
  metricsJson: Record<string, any>;
  sourceSnapshotId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface KeywordClusterCreateRequest {
  name: string;
  intentType?: string;
  keywords?: string[];
  metricsJson?: Record<string, any>;
  sourceSnapshotId?: string;
}

// === Persona ===
export interface PersonaResponse {
  id: string;
  workspaceId: string;
  name: string;
  pains: string[];
  objections: string[];
  motivations: string[];
  channels: string[];
  language: string;
  sentiment: string | null;
  sourceSnapshotId: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface PersonaCreateRequest {
  name: string;
  pains?: string[];
  objections?: string[];
  motivations?: string[];
  channels?: string[];
  language?: string;
  sentiment?: string;
  sourceSnapshotId?: string;
}

// === Watchlist ===
export interface WatchlistResponse {
  id: string;
  workspaceId: string;
  watchlistType: string;
  name: string;
  competitorId: string | null;
  queryJson: Record<string, any>;
  frequency: string;
  enabled: boolean;
  lastRefreshedAt: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface WatchlistCreateRequest {
  watchlistType: string;
  name: string;
  competitorId?: string;
  queryJson?: Record<string, any>;
  frequency?: string;
}

// === Job ===
export interface JobResponse {
  id: string;
  workspaceId: string;
  jobType: string;
  status: string;
  requestedByUserId: string;
  inputJson: Record<string, any>;
  startedAt: string | null;
  finishedAt: string | null;
  statsJson: Record<string, any> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === ResearchLink ===
export interface ResearchLinkResponse {
  id: string;
  workspaceId: string;
  researchEntityType: string;
  researchEntityId: string;
  linkedEntityType: string;
  linkedEntityId: string;
  relationType: string;
  note: string | null;
  createdByUserId: string;
  createdAt: string;
}
export interface ResearchLinkCreateRequest {
  researchEntityType: string;
  researchEntityId: string;
  linkedEntityType: string;
  linkedEntityId: string;
  relationType: string;
  note?: string;
}

// === Ingestion ===
export interface IngestUrlRequest {
  title: string;
  url: string;
  snapshotType?: string;
  competitorId?: string;
  rawText?: string;
  summaryText?: string;
  metaJson?: Record<string, any>;
}
export interface IngestFileRequest {
  title: string;
  fileUrl: string;
  snapshotType: string;
  competitorId?: string;
  summaryText?: string;
  metaJson?: Record<string, any>;
}
export interface IngestResponse {
  sourceId: string;
  snapshotId: string;
  jobId: string;
}

// === AI Responses ===
export interface SummarizeRequest {
  language?: string;
  providerOverride?: string;
  modelOverride?: string;
}
export interface SummarizeResponse {
  snapshotId: string;
  summary: string;
  keyPoints: string[];
  entities: string[];
  sentiment: string | null;
  runId: string;
  aiLinkId: string;
}
export interface ExtractRequest {
  snapshotIds: string[];
  insightTypes?: string[];
  language?: string;
}
export interface ExtractResponse {
  createdInsightIds: string[];
  runId: string;
  aiLinkIds: string[];
}
export interface ClusterRequest {
  snapshotId?: string;
  keywords?: string[];
  language?: string;
}
export interface ClusterResponse {
  createdClusterIds: string[];
  runId: string;
}
export interface PersonaDraftRequest {
  personaName: string;
  snapshotIds: string[];
  language?: string;
}
export interface PersonaDraftResponse {
  personaId: string;
  runId: string;
}
export interface DigestRunRequest {
  periodStart: string;
  periodEnd: string;
}
export interface DigestRunResponse {
  digestReportId: string;
  workflowRunId: string;
  aiLinkId: string;
}
export interface DigestReportResponse {
  id: string;
  workspaceId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentText: string;
  contentJson: Record<string, any>;
  aiPromptRunId: string | null;
  createdByUserId: string;
  createdAt: string;
}
export interface ResearchAiRunLinkResponse {
  id: string;
  workspaceId: string;
  aiPromptRunId: string | null;
  aiConversationId: string | null;
  aiMessageId: string | null;
  producedEntityType: string;
  producedEntityId: string;
  snapshotIds: string[];
  createdByUserId: string;
  createdAt: string;
}

// === Enums (for dropdowns) ===
export const RESEARCH_CATEGORIES = ['COMPETITOR', 'TREND', 'AUDIENCE', 'KEYWORD', 'CREATIVE'] as const;
export const SOURCE_TYPES = ['URL', 'FILE_UPLOAD', 'MANUAL', 'INTEGRATION_RESOURCE', 'NOTE'] as const;
export const SNAPSHOT_TYPES = [
  'WEB_PAGE',
  'AD_LIBRARY_ENTRY',
  'SOCIAL_POST',
  'SEARCH_RESULT',
  'KEYWORD_DATA',
  'REVIEW',
  'TRANSCRIPT',
  'PDF',
  'IMAGE',
  'VIDEO_METADATA',
  'CUSTOM',
] as const;
export const INSIGHT_TYPES = [
  'COMPETITOR_POSITIONING', 'COMPETITOR_OFFER', 'COMPETITOR_PRICING', 'COMPETITOR_CREATIVE_PATTERN',
  'TREND_TOPIC', 'TREND_HASHTAG', 'TREND_AUDIO', 'TREND_FORMAT',
  'AUDIENCE_PERSONA', 'AUDIENCE_PAIN_POINT', 'AUDIENCE_OBJECTION', 'AUDIENCE_MOTIVATION',
  'KEYWORD_CLUSTER', 'INTENT_CLUSTER',
  'CREATIVE_HOOK', 'CREATIVE_ANGLE', 'CREATIVE_CTA_PATTERN', 'CREATIVE_VISUAL_PATTERN',
] as const;
export const INSIGHT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const CONFIDENCE_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const WATCHLIST_TYPES = ['COMPETITOR', 'TOPIC', 'KEYWORD', 'CREATOR', 'BRAND_TERM'] as const;
export const REFRESH_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'MANUAL'] as const;
export const RELATION_TYPES = ['SUPPORTS', 'CONTRADICTS', 'INSPIRES', 'BENCHMARKS', 'USED_IN', 'TARGETS'] as const;
export const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN'] as const;
