export interface OrgBrandProfileResponse {
  id: string;
  orgId: string;
  displayName: string;
  status: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontPrimary: string | null;
  fontSecondary: string | null;
  logoAssetId: string | null;
  voiceTone: string;
  voiceGuidelinesText: string | null;
  doListText: string | null;
  dontListText: string | null;
  defaultLanguage: string;
  supportedLanguages: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgBrandProfilePatchRequest {
  displayName?: string;
  status?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontPrimary?: string;
  fontSecondary?: string;
  logoAssetId?: string;
  voiceTone?: string;
  voiceGuidelinesText?: string;
  doListText?: string;
  dontListText?: string;
  defaultLanguage?: string;
  supportedLanguages?: string;
}

export interface EffectiveBrandProfileResponse {
  orgBrandProfileId: string;
  workspaceBrandProfileId: string | null;
  displayName: string;
  status: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontPrimary: string | null;
  fontSecondary: string | null;
  logoAssetId: string | null;
  voiceTone: string;
  voiceGuidelinesText: string | null;
  doListText: string | null;
  dontListText: string | null;
  defaultLanguage: string;
  supportedLanguages: string;
  overridesJson: string;
}

export interface BrandAssetResponse {
  id: string;
  scope: string;
  orgId: string;
  workspaceId: string | null;
  name: string;
  assetType: string;
  fileUrl: string;
  checksum: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  tags: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandAssetCreateRequest {
  scope: string;
  workspaceId?: string;
  name: string;
  assetType: string;
  fileUrl: string;
  checksum?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  tags?: string;
}

export interface BrandAssetPatchRequest {
  name?: string;
  assetType?: string;
  tags?: string;
  status?: string;
}

export interface BrandRuleSetResponse {
  id: string;
  scope: string;
  orgId: string;
  workspaceId: string | null;
  name: string;
  domain: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandRuleSetCreateRequest {
  scope: string;
  workspaceId?: string;
  name: string;
  domain?: string;
  description?: string;
}

export interface BrandRuleResponse {
  id: string;
  ruleSetId: string;
  ruleType: string;
  severity: string;
  name: string;
  description: string | null;
  pattern: string | null;
  parametersJson: string;
  appliesToJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandRuleCreateRequest {
  ruleType: string;
  severity: string;
  name: string;
  description?: string;
  pattern?: string;
  parametersJson?: string;
  appliesToJson?: string;
}

export interface DisclaimerResponse {
  id: string;
  scope: string;
  orgId: string;
  workspaceId: string | null;
  key: string;
  title: string;
  defaultText: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisclaimerCreateRequest {
  scope: string;
  workspaceId?: string;
  key: string;
  title: string;
  defaultText: string;
}

export interface DisclaimerLocalizationResponse {
  id: string;
  disclaimerId: string;
  language: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisclaimerLocalizationRequest {
  language: string;
  text: string;
}

export interface TemplateResponse {
  id: string;
  scope: string;
  orgId: string;
  workspaceId: string | null;
  templateType: string;
  name: string;
  description: string | null;
  status: string;
  contentJson: string;
  tags: string;
  version: number;
  parentTemplateId: string | null;
  ruleSetId: string | null;
  defaultDisclaimerIds: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateCreateRequest {
  scope: string;
  workspaceId?: string;
  templateType: string;
  name: string;
  description?: string;
  contentJson: string;
  tags?: string;
  ruleSetId?: string;
  defaultDisclaimerIds?: string;
}

export interface TemplatePatchRequest {
  name?: string;
  description?: string;
  contentJson?: string;
  tags?: string;
  ruleSetId?: string;
  defaultDisclaimerIds?: string;
}

export interface TemplateUsageResponse {
  id: string;
  templateId: string;
  workspaceId: string;
  usedInEntityType: string;
  usedInEntityId: string;
  usedByUserId: string;
  usedAt: string;
}

export interface TemplateUsageRequest {
  workspaceId: string;
  usedInEntityType: string;
  usedInEntityId: string;
}

export interface GovernanceCheckRequest {
  entityType: string;
  entityId: string;
  contentPayloadJson: string;
  ruleSetId?: string;
  platformType?: string;
  language?: string;
}

export interface GovernanceCheckRunResponse {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  ruleSetId: string | null;
  platformType: string | null;
  language: string | null;
  status: string;
  findingsJson: string;
  createdByUserId: string;
  createdAt: string;
}

export interface GovernanceFinding {
  severity: string;
  ruleId: string;
  message: string;
  evidence: string;
  suggestion: string;
}

export interface PlatformConstraintResponse {
  id: string;
  platformType: string;
  constraintType: string;
  valueJson: string;
  createdAt: string;
  updatedAt: string;
}
