export interface CreativeAssetResponse {
  id: string;
  workspaceId: string;
  orgId: string;
  assetType: string;
  status: string;
  visibility: string;
  name: string;
  description: string;
  sourceType: string;
  sourceUrl: string;
  fileUrl: string;
  mimeType: string;
  checksum: string;
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  tags: string;
  metaJson: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeAssetVersionResponse {
  id: string;
  assetId: string;
  versionNumber: number;
  versionType: string;
  changeNotes: string;
  fileUrl: string;
  checksum: string;
  width: number;
  height: number;
  durationSeconds: number;
  sizeBytes: number;
  metaJson: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CopyArtifactResponse {
  id: string;
  workspaceId: string;
  orgId: string;
  type: string;
  status: string;
  name: string;
  language: string;
  format: string;
  contentText: string;
  contentJson: string;
  templateId: string;
  ruleSetId: string;
  disclaimerIds: string;
  governanceCheckRunId: string;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariantSetResponse {
  id: string;
  workspaceId: string;
  name: string;
  parentEntityType: string;
  parentEntityId: string;
  strategy: string;
  parametersJson: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface VariantResponse {
  id: string;
  variantSetId: string;
  variantIndex: number;
  entityType: string;
  entityId: string;
  score: string;
  notes: string;
  createdAt: string;
}

export interface CreativeUsageResponse {
  id: string;
  workspaceId: string;
  usedEntityType: string;
  usedEntityId: string;
  creativeEntityType: string;
  creativeEntityId: string;
  relationType: string;
  contextJson: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreativeLinkResponse {
  id: string;
  workspaceId: string;
  fromEntityType: string;
  fromEntityId: string;
  toEntityType: string;
  toEntityId: string;
  relationType: string;
  note: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreativeAiRunLinkResponse {
  id: string;
  workspaceId: string;
  aiPromptRunId: string;
  aiConversationId: string;
  aiMessageId: string;
  producedEntityType: string;
  producedEntityId: string;
  inputContextJson: string;
  citationsJson: string;
  createdByUserId: string;
  createdAt: string;
}

export interface FolderResponse {
  id: string;
  workspaceId: string;
  name: string;
  parentFolderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RenderPresetResponse {
  id: string;
  workspaceId: string;
  preset: string;
  constraintsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateCopyResponse {
  copyArtifactIds: string[];
  variantSetId: string;
  runId: string;
  aiLinkIds: string[];
  governanceStatuses: string[];
}

export interface GenerateHooksResponse {
  artifactIds: string[];
  runId: string;
}

export interface GenerateVideoScriptResponse {
  copyArtifactId: string;
  runId: string;
}

export interface GenerateUgcBriefResponse {
  copyArtifactId: string;
  runId: string;
}

export interface EnrichAssetResponse {
  proposalId: string;
  runId: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
