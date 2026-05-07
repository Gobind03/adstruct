// Enums as string unions
export type LlmProviderType = 'OPENAI' | 'PERPLEXITY' | 'CUSTOM_HTTP' | 'MOCK';
export type AgentMode = 'CHAT_ONLY' | 'TOOL_ASSISTED' | 'WORKFLOW';
export type ConversationStatus = 'ACTIVE' | 'ARCHIVED';
export type MessageRole = 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';
export type ToolCallStatus = 'PROPOSED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED';
export type AgentActionStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
export type PromptStatus = 'DRAFT' | 'APPROVED' | 'ARCHIVED';
export type PromptScope = 'ORG' | 'WORKSPACE';
export type ToolRiskLevel = 'READ_ONLY' | 'SAFE_WRITE' | 'HIGH_RISK_WRITE';
export type LlmCallPurpose =
  | 'CHAT'
  | 'SUMMARIZE'
  | 'EXTRACT'
  | 'CLASSIFY'
  | 'GENERATE'
  | 'PLAN'
  | 'TOOL_ROUTING';
export type OutputFormat = 'TEXT' | 'JSON';

/** Matches AiProviderConfigResponse */
export interface AiProviderConfig {
  id: string;
  orgId: string;
  integrationAccountId: string | null;
  providerType: LlmProviderType;
  defaultModel: string;
  endpointBaseUrl: string | null;
  requestTimeoutMs: number;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiWorkspacePreferenceResponse */
export interface AiWorkspacePreference {
  id: string;
  workspaceId: string;
  providerConfigId: string | null;
  providerType: LlmProviderType | null;
  defaultModel: string | null;
  isDefault: boolean;
  allowedModels: string;
  policyJson: string;
  createdAt: string;
}

/** Matches AiPromptTemplateResponse */
export interface AiPromptTemplate {
  id: string;
  scope: PromptScope;
  orgId: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  purpose: LlmCallPurpose;
  status: PromptStatus;
  outputFormat: OutputFormat;
  inputSchemaJson: string | null;
  outputSchemaJson: string | null;
  systemPrompt: string;
  userPromptTemplate: string;
  guardrailsText: string | null;
  tags: string;
  version: number;
  parentTemplateId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiPromptRunResponse */
export interface AiPromptRun {
  id: string;
  workspaceId: string;
  promptTemplateId: string;
  model: string | null;
  outputText: string | null;
  outputJson: string | null;
  tokenUsageJson: string | null;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

/** Matches AiConversationResponse */
export interface AiConversation {
  id: string;
  workspaceId: string;
  title: string;
  status: ConversationStatus;
  agentMode: AgentMode | null;
  providerConfigId: string | null;
  model: string | null;
  contextJson: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiMessageResponse */
export interface AiMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  contentJson: string | null;
  createdByUserId: string | null;
  createdAt: string;
  citations: AiCitation[];
}

/** Matches AiCitationResponse */
export interface AiCitation {
  id: string;
  citationType: string | null;
  referenceType: string | null;
  referenceId: string | null;
  url: string | null;
  label: string | null;
  metaJson: string | null;
  createdAt: string;
}

/** Matches AiToolDefinitionResponse */
export interface AiToolDefinition {
  id: string;
  name: string;
  description: string | null;
  riskLevel: ToolRiskLevel | null;
  inputSchemaJson: string | null;
  outputSchemaJson: string | null;
  enabled: boolean;
}

/** Matches AiToolCallResponse */
export interface AiToolCall {
  id: string;
  conversationId: string;
  toolName: string;
  status: ToolCallStatus | null;
  inputJson: string | null;
  outputJson: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

/** Matches AiActionProposalResponse */
export interface AiActionProposal {
  id: string;
  workspaceId: string;
  conversationId: string | null;
  title: string;
  description: string | null;
  actionType: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  payloadJson: string | null;
  status: AgentActionStatus | null;
  requestedByUserId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  executedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiSafetyPolicyResponse */
export interface AiSafetyPolicy {
  id: string;
  workspaceId: string;
  policyJson: string;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiRedactionRuleResponse */
export interface AiRedactionRule {
  id: string;
  workspaceId: string;
  name: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiWorkflowDefinitionResponse */
export interface AiWorkflowDefinition {
  id: string;
  scope: PromptScope;
  orgId: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  stepsJson: string;
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
}

/** Matches AiWorkflowRunResponse */
export interface AiWorkflowRun {
  id: string;
  workflowDefinitionId: string;
  workspaceId: string;
  conversationId: string | null;
  inputJson: string;
  outputJson: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

/** Matches PostMessageResponse */
export interface PostMessageResponse {
  assistantMessage: AiMessage;
  toolCalls: AiToolCall[];
  citations: AiCitation[];
}

/** Matches AiConversationWithMessagesResponse */
export interface AiConversationWithMessagesResponse {
  conversation: AiConversation;
  messages: AiMessage[];
}

/** Matches AiRewriteRequest */
export interface AiRewriteRequest {
  text: string;
  platformType?: string | null;
  language?: string | null;
}

/** Matches AiRewriteResponse */
export interface AiRewriteResponse {
  originalText: string;
  rewrittenText: string;
  runId: string;
}

/** Matches AiResult */
export interface AiResult {
  outputText: string | null;
  outputJson: string | null;
  citations: AiCitation[];
  runId: string;
}

// —— Create / patch / run request bodies ——

/** Matches AiConversationCreateRequest */
export interface AiConversationCreateRequest {
  title: string;
  agentMode?: string | null;
  providerConfigId?: string | null;
  model?: string | null;
  contextJson?: string | null;
}

/** Matches AiMessageCreateRequest */
export interface AiMessageCreateRequest {
  content: string;
}

/** Matches AiProviderConfigCreateRequest */
export interface AiProviderConfigCreateRequest {
  integrationAccountId?: string | null;
  providerType: string;
  defaultModel: string;
  endpointBaseUrl?: string | null;
  maxTokens?: number | null;
  requestTimeoutMs?: number | null;
  temperature?: number | null;
  enabled?: boolean | null;
  apiKey?: string | null;
  displayName?: string | null;
}

/** Matches AiProviderConfigPatchRequest */
export interface AiProviderConfigPatchRequest {
  defaultModel?: string | null;
  endpointBaseUrl?: string | null;
  requestTimeoutMs?: number | null;
  maxTokens?: number | null;
  temperature?: number | null;
  enabled?: boolean | null;
}

/** Matches AiWorkspacePreferenceCreateRequest */
export interface AiWorkspacePreferenceCreateRequest {
  providerConfigId: string;
  isDefault?: boolean | null;
  allowedModels?: string | null;
  policyJson?: string | null;
}

/** Matches AiWorkspacePreferencePatchRequest */
export interface AiWorkspacePreferencePatchRequest {
  isDefault?: boolean | null;
  allowedModels?: string | null;
  policyJson?: string | null;
}

/** Matches AiPromptCreateRequest */
export interface AiPromptCreateRequest {
  name: string;
  description?: string | null;
  purpose: string;
  scope?: string | null;
  outputFormat?: string | null;
  inputSchemaJson?: string | null;
  outputSchemaJson?: string | null;
  systemPrompt: string;
  userPromptTemplate: string;
  guardrailsText?: string | null;
  tags?: string | null;
  workspaceId?: string | null;
}

/** Matches AiPromptPatchRequest */
export interface AiPromptPatchRequest {
  name?: string | null;
  description?: string | null;
  purpose?: string | null;
  outputFormat?: string | null;
  systemPrompt?: string | null;
  userPromptTemplate?: string | null;
  guardrailsText?: string | null;
  tags?: string | null;
}

/** Matches AiPromptRunRequest */
export interface AiPromptRunRequest {
  inputJson: string;
  providerOverrideId?: string | null;
  modelOverride?: string | null;
}

/** Matches AiWorkflowCreateRequest */
export interface AiWorkflowCreateRequest {
  name: string;
  description?: string | null;
  scope?: string | null;
  workspaceId?: string | null;
  stepsJson: string;
}

/** Matches AiWorkflowRunRequest */
export interface AiWorkflowRunRequest {
  inputJson: string;
  conversationId?: string | null;
}

/** Matches AiSafetyPolicyPatchRequest */
export interface AiSafetyPolicyPatchRequest {
  policyJson: string;
}

/** Matches AiRedactionRuleCreateRequest */
export interface AiRedactionRuleCreateRequest {
  name: string;
  pattern: string;
  replacement?: string | null;
  enabled?: boolean | null;
}

/** Matches AiRedactionRulePatchRequest */
export interface AiRedactionRulePatchRequest {
  name?: string | null;
  pattern?: string | null;
  replacement?: string | null;
  enabled?: boolean | null;
}

/** Query params for listing prompt templates */
export interface AiPromptListParams {
  scope?: string;
  workspaceId?: string;
  purpose?: string;
  status?: string;
  tag?: string;
}

/** Query params for listing workflow definitions */
export interface AiWorkflowListParams {
  scope?: string;
  workspaceId?: string;
  status?: string;
}
