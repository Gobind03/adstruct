-- ============================================================
-- V13: Creative Studio (Module 5)
-- ============================================================

-- ============================================================
-- 1) creative_assets
-- ============================================================
CREATE TABLE creative_assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_type          VARCHAR(30) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    visibility          VARCHAR(20) NOT NULL DEFAULT 'WORKSPACE',
    name                VARCHAR(180) NOT NULL,
    description         TEXT,
    source_type         VARCHAR(40) NOT NULL DEFAULT 'URL',
    source_url          VARCHAR(800) NOT NULL,
    file_url            VARCHAR(800) NOT NULL,
    mime_type           VARCHAR(80),
    checksum            VARCHAR(80),
    width               INT,
    height              INT,
    duration_seconds    INT,
    size_bytes          BIGINT,
    tags                JSONB NOT NULL DEFAULT '[]',
    meta_json           JSONB NOT NULL DEFAULT '{}',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_asset_workspace_status ON creative_assets(workspace_id, status);
CREATE INDEX idx_asset_type ON creative_assets(workspace_id, asset_type);
CREATE INDEX idx_asset_name ON creative_assets(workspace_id, name);
CREATE INDEX idx_asset_tags ON creative_assets USING gin (tags jsonb_ops);

-- ============================================================
-- 2) creative_asset_versions
-- ============================================================
CREATE TABLE creative_asset_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id            UUID NOT NULL REFERENCES creative_assets(id) ON DELETE CASCADE,
    version_number      INT NOT NULL,
    version_type        VARCHAR(20) NOT NULL DEFAULT 'MINOR',
    change_notes        VARCHAR(400),
    file_url            VARCHAR(800) NOT NULL,
    checksum            VARCHAR(80),
    width               INT,
    height              INT,
    duration_seconds    INT,
    size_bytes          BIGINT,
    meta_json           JSONB NOT NULL DEFAULT '{}',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_asset_version UNIQUE (asset_id, version_number)
);
CREATE INDEX idx_asset_version_asset ON creative_asset_versions(asset_id);

-- ============================================================
-- 3) creative_folders
-- ============================================================
CREATE TABLE creative_folders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(160) NOT NULL,
    parent_folder_id    UUID REFERENCES creative_folders(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_folder_workspace_parent_name UNIQUE (workspace_id, parent_folder_id, name)
);

-- ============================================================
-- 4) creative_asset_folder_map
-- ============================================================
CREATE TABLE creative_asset_folder_map (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id   UUID NOT NULL REFERENCES creative_folders(id) ON DELETE CASCADE,
    asset_id    UUID NOT NULL REFERENCES creative_assets(id) ON DELETE CASCADE,
    CONSTRAINT uq_folder_asset UNIQUE (folder_id, asset_id)
);

-- ============================================================
-- 5) creative_copy_artifacts
-- ============================================================
CREATE TABLE creative_copy_artifacts (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id                UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    org_id                      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type                        VARCHAR(40) NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    name                        VARCHAR(180) NOT NULL,
    language                    VARCHAR(12) NOT NULL DEFAULT 'en',
    format                      VARCHAR(30),
    content_text                TEXT NOT NULL,
    content_json                JSONB NOT NULL DEFAULT '{}',
    template_id                 UUID,
    rule_set_id                 UUID,
    disclaimer_ids              JSONB NOT NULL DEFAULT '[]',
    governance_check_run_id     UUID,
    created_by_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by_user_id          UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_copy_workspace_type_status ON creative_copy_artifacts(workspace_id, type, status);
CREATE INDEX idx_copy_template ON creative_copy_artifacts(template_id);

-- ============================================================
-- 6) creative_variant_sets
-- ============================================================
CREATE TABLE creative_variant_sets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(180) NOT NULL,
    parent_entity_type  VARCHAR(60) NOT NULL,
    parent_entity_id    UUID NOT NULL,
    strategy            VARCHAR(80) NOT NULL,
    parameters_json     JSONB NOT NULL DEFAULT '{}',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_variantset_parent ON creative_variant_sets(parent_entity_type, parent_entity_id);

-- ============================================================
-- 7) creative_variants
-- ============================================================
CREATE TABLE creative_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_set_id  UUID NOT NULL REFERENCES creative_variant_sets(id) ON DELETE CASCADE,
    variant_index   INT NOT NULL,
    entity_type     VARCHAR(60) NOT NULL,
    entity_id       UUID NOT NULL,
    score           NUMERIC(6,3),
    notes           VARCHAR(300),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_variant_set_index UNIQUE (variant_set_id, variant_index)
);

-- ============================================================
-- 8) creative_usages
-- ============================================================
CREATE TABLE creative_usages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    used_entity_type        VARCHAR(40) NOT NULL,
    used_entity_id          UUID NOT NULL,
    creative_entity_type    VARCHAR(40) NOT NULL,
    creative_entity_id      UUID NOT NULL,
    relation_type           VARCHAR(30) NOT NULL DEFAULT 'USES',
    context_json            JSONB NOT NULL DEFAULT '{}',
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_creative_usage UNIQUE (workspace_id, used_entity_type, used_entity_id, creative_entity_type, creative_entity_id, relation_type)
);
CREATE INDEX idx_usage_workspace_entity ON creative_usages(workspace_id, used_entity_type, used_entity_id);
CREATE INDEX idx_usage_creative ON creative_usages(creative_entity_type, creative_entity_id);

-- ============================================================
-- 9) creative_links
-- ============================================================
CREATE TABLE creative_links (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    from_entity_type    VARCHAR(60) NOT NULL,
    from_entity_id      UUID NOT NULL,
    to_entity_type      VARCHAR(60) NOT NULL,
    to_entity_id        UUID NOT NULL,
    relation_type       VARCHAR(30) NOT NULL,
    note                VARCHAR(400),
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_creative_link UNIQUE (workspace_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, relation_type)
);

-- ============================================================
-- 10) creative_render_presets
-- ============================================================
CREATE TABLE creative_render_presets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    preset              VARCHAR(40) NOT NULL,
    constraints_json    JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_render_preset UNIQUE (workspace_id, preset)
);

-- ============================================================
-- 11) creative_ai_run_links
-- ============================================================
CREATE TABLE creative_ai_run_links (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    ai_prompt_run_id        UUID,
    ai_conversation_id      UUID,
    ai_message_id           UUID,
    produced_entity_type    VARCHAR(60) NOT NULL,
    produced_entity_id      UUID NOT NULL,
    input_context_json      JSONB NOT NULL DEFAULT '{}',
    citations_json          JSONB NOT NULL DEFAULT '[]',
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_creative_ai_link_workspace ON creative_ai_run_links(workspace_id);
CREATE INDEX idx_creative_ai_link_produced ON creative_ai_run_links(produced_entity_type, produced_entity_id);

-- ============================================================
-- 12) Add creative columns to sponsored_units
-- ============================================================
ALTER TABLE sponsored_units ADD COLUMN copy_artifact_id UUID REFERENCES creative_copy_artifacts(id) ON DELETE SET NULL;
ALTER TABLE sponsored_units ADD COLUMN asset_id UUID REFERENCES creative_assets(id) ON DELETE SET NULL;

-- ============================================================
-- 13) Seed AI Prompt Templates for Creative Studio
-- ============================================================
INSERT INTO ai_prompt_templates (org_id, scope, name, description, purpose, status, output_format,
    system_prompt, user_prompt_template, guardrails_text,
    input_schema_json, output_schema_json, tags, version, created_by_user_id, updated_by_user_id)
VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ORG',
    'creative.generate_ad_copy_variants',
    'Generate multiple ad copy variants based on brand profile, template, persona, and platform constraints.',
    'GENERATE', 'APPROVED', 'JSON',
    'You are a professional advertising copywriter. Use the brand voice, persona insights, and platform constraints provided. Output valid JSON only.',
    'Generate {{numVariants}} ad copy variants for the following context:
Brand Profile: {{brandProfile}}
Template: {{template}}
Persona: {{persona}}
Keywords: {{keywords}}
Insights: {{insights}}
Platform: {{platformType}}
Language: {{language}}
Tone: {{tone}}
Constraints: {{constraints}}

Output JSON matching the schema exactly.',
    'Do not make factual claims not supported by inputs. Use brand voice consistently. Respect platform character limits. Cite insight IDs when referencing research data.',
    '{"type":"object","properties":{"numVariants":{"type":"integer"},"brandProfile":{"type":"object"},"template":{"type":"object"},"persona":{"type":"object"},"keywords":{"type":"array"},"insights":{"type":"array"},"platformType":{"type":"string"},"language":{"type":"string"},"tone":{"type":"string"},"constraints":{"type":"object"}}}',
    '{"type":"object","properties":{"variants":{"type":"array","items":{"type":"object","properties":{"primaryText":{"type":"string"},"headline":{"type":"string"},"description":{"type":"string"},"cta":{"type":"string"},"notes":{"type":"string"},"citations":{"type":"array","items":{"type":"object","properties":{"type":{"type":"string"},"id":{"type":"string"}}}}}}},"recommendedDisclaimers":{"type":"array"},"assumptions":{"type":"array"}}}',
    '["creative","ad-copy","generation"]', 1,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ORG',
    'creative.generate_hooks_angles_ctas',
    'Generate lists of hooks, angles, and CTAs for creative brainstorming.',
    'GENERATE', 'APPROVED', 'JSON',
    'You are a creative strategist specializing in advertising hooks, angles, and calls-to-action. Output valid JSON only.',
    'Generate hooks, angles, and CTAs for:
Topic: {{topic}}
Persona: {{persona}}
Insights: {{insights}}
Language: {{language}}

Output JSON matching the schema exactly.',
    'Focus on actionable, concise hooks. Each CTA should be under 5 words. Cite insight IDs where applicable.',
    '{"type":"object","properties":{"topic":{"type":"string"},"persona":{"type":"object"},"insights":{"type":"array"},"language":{"type":"string"}}}',
    '{"type":"object","properties":{"hooks":{"type":"array","items":{"type":"string"}},"angles":{"type":"array","items":{"type":"string"}},"ctas":{"type":"array","items":{"type":"string"}}}}',
    '["creative","hooks","angles","ctas"]', 1,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ORG',
    'creative.generate_video_script',
    'Generate a video script with scene-by-scene breakdown.',
    'GENERATE', 'APPROVED', 'JSON',
    'You are a professional video scriptwriter for advertising. Output valid JSON only.',
    'Generate a video script for:
Product: {{product}}
Offer: {{offer}}
Duration: {{durationSeconds}} seconds
Platform: {{platformType}}
Language: {{language}}
Persona: {{persona}}

Output JSON matching the schema exactly.',
    'Keep scenes within the specified duration. Each scene should have clear visual direction and audio/caption guidance.',
    '{"type":"object","properties":{"product":{"type":"string"},"offer":{"type":"string"},"durationSeconds":{"type":"integer"},"platformType":{"type":"string"},"language":{"type":"string"},"persona":{"type":"object"}}}',
    '{"type":"object","properties":{"script":{"type":"string"},"scenes":{"type":"array","items":{"type":"object","properties":{"scene":{"type":"integer"},"visual":{"type":"string"},"audio":{"type":"string"},"caption":{"type":"string"}}}},"durationSeconds":{"type":"integer"}}}',
    '["creative","video","script"]', 1,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ORG',
    'creative.generate_ugc_brief',
    'Generate a UGC creator brief with deliverables and guidelines.',
    'GENERATE', 'APPROVED', 'JSON',
    'You are a UGC campaign strategist. Output valid JSON only.',
    'Generate a UGC creator brief for:
Product: {{product}}
Deliverables: {{deliverables}}
Language: {{language}}
Tone: {{tone}}

Output JSON matching the schema exactly.',
    'Be specific about deliverable format, duration, and content guidelines. Include do-s and don''t-s.',
    '{"type":"object","properties":{"product":{"type":"string"},"deliverables":{"type":"array"},"language":{"type":"string"},"tone":{"type":"string"}}}',
    '{"type":"object","properties":{"briefTitle":{"type":"string"},"objective":{"type":"string"},"deliverables":{"type":"array","items":{"type":"object","properties":{"format":{"type":"string"},"description":{"type":"string"},"duration":{"type":"string"}}}},"guidelines":{"type":"object","properties":{"dos":{"type":"array","items":{"type":"string"}},"donts":{"type":"array","items":{"type":"string"}}}},"talkingPoints":{"type":"array","items":{"type":"string"}}}}',
    '["creative","ugc","brief"]', 1,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
),
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ORG',
    'creative.enrich_asset_metadata',
    'AI-enrich asset metadata with suggested tags, formats, and quality warnings.',
    'CLASSIFY', 'APPROVED', 'JSON',
    'You are a digital asset management specialist. Analyze assets and suggest metadata improvements. Output valid JSON only.',
    'Enrich metadata for the following asset:
Name: {{name}}
Description: {{description}}
Asset Type: {{assetType}}
Current Tags: {{currentTags}}
URL: {{sourceUrl}}
Platform: {{platformType}}
Language: {{language}}

Output JSON matching the schema exactly.',
    'Do not remove existing tags. Suggest additional tags only. Be specific about format suitability per platform.',
    '{"type":"object","properties":{"name":{"type":"string"},"description":{"type":"string"},"assetType":{"type":"string"},"currentTags":{"type":"array"},"sourceUrl":{"type":"string"},"platformType":{"type":"string"},"language":{"type":"string"}}}',
    '{"type":"object","properties":{"suggestedTags":{"type":"array","items":{"type":"string"}},"suggestedFormats":{"type":"array","items":{"type":"string"}},"qualityWarnings":{"type":"array","items":{"type":"string"}},"altText":{"type":"string"}}}',
    '["creative","asset","metadata","enrichment"]', 1,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'
);

-- ============================================================
-- 14) Seed AI Tool Definitions for Creative Studio
-- ============================================================
INSERT INTO ai_tool_definitions (name, description, risk_level, input_schema_json, output_schema_json) VALUES
('creative.searchAssets',
 'Search creative assets in the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{"q":{"type":"string"},"tags":{"type":"array","items":{"type":"string"}},"type":{"type":"string"},"limit":{"type":"integer","default":20}}}',
 '{"type":"object","properties":{"items":{"type":"array"}}}'),

('creative.getAsset',
 'Get details of a specific creative asset.',
 'READ_ONLY',
 '{"type":"object","properties":{"assetId":{"type":"string"}},"required":["assetId"]}',
 '{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"assetType":{"type":"string"},"fileUrl":{"type":"string"},"tags":{"type":"array"}}}'),

('creative.searchCopyArtifacts',
 'Search creative copy artifacts in the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{"q":{"type":"string"},"type":{"type":"string"},"status":{"type":"string"},"limit":{"type":"integer","default":20}}}',
 '{"type":"object","properties":{"items":{"type":"array"}}}'),

('creative.getCopyArtifact',
 'Get details of a specific creative copy artifact.',
 'READ_ONLY',
 '{"type":"object","properties":{"copyArtifactId":{"type":"string"}},"required":["copyArtifactId"]}',
 '{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"type":{"type":"string"},"contentText":{"type":"string"}}}'),

('creative.listUsageForCreative',
 'List usage records for a creative entity (asset or copy artifact).',
 'READ_ONLY',
 '{"type":"object","properties":{"creativeEntityType":{"type":"string"},"creativeEntityId":{"type":"string"}},"required":["creativeEntityType","creativeEntityId"]}',
 '{"type":"object","properties":{"items":{"type":"array"}}}');

-- Update safety policies to allow creative tools
UPDATE ai_safety_policies
SET policy_json = jsonb_set(
    policy_json,
    '{allowedTools}',
    (policy_json->'allowedTools') || '["creative.*"]'::jsonb
)
WHERE NOT (policy_json->'allowedTools' @> '["creative.*"]'::jsonb);
