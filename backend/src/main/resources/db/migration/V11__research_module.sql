-- ============================================================
-- V11: Research & Intelligence Module
-- ============================================================

-- ============================================================
-- 1) competitors
-- ============================================================
CREATE TABLE competitors (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,
    website_url         VARCHAR(500),
    description         TEXT,
    category_tags       JSONB NOT NULL DEFAULT '[]',
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitor_workspace_status ON competitors(workspace_id, status);
ALTER TABLE competitors ADD CONSTRAINT uq_competitor_workspace_name UNIQUE (workspace_id, name);

-- ============================================================
-- 2) competitor_external_handles
-- ============================================================
CREATE TABLE competitor_external_handles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitor_id   UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    platform_type   VARCHAR(40) NOT NULL,
    handle          VARCHAR(200) NOT NULL,
    url             VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE competitor_external_handles
    ADD CONSTRAINT uq_handle_competitor_platform UNIQUE (competitor_id, platform_type, handle);

-- ============================================================
-- 3) research_sources
-- ============================================================
CREATE TABLE research_sources (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id             UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type              VARCHAR(40) NOT NULL,
    title                    VARCHAR(300) NOT NULL,
    url                      VARCHAR(500),
    competitor_id            UUID REFERENCES competitors(id) ON DELETE SET NULL,
    integration_account_id   UUID REFERENCES integration_accounts(id) ON DELETE SET NULL,
    integration_resource_id  UUID REFERENCES integration_resources(id) ON DELETE SET NULL,
    file_url                 VARCHAR(500),
    note_text                TEXT,
    meta_json                JSONB NOT NULL DEFAULT '{}',
    created_by_user_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_source_workspace_type ON research_sources(workspace_id, source_type);
CREATE INDEX idx_source_competitor ON research_sources(competitor_id);
CREATE INDEX idx_source_integration ON research_sources(integration_account_id);

-- ============================================================
-- 4) source_snapshots
-- ============================================================
CREATE TABLE source_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id           UUID NOT NULL REFERENCES research_sources(id) ON DELETE CASCADE,
    snapshot_type       VARCHAR(40) NOT NULL,
    captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_hash        VARCHAR(128),
    title               VARCHAR(300),
    summary_text        TEXT,
    raw_text            TEXT,
    raw_json            JSONB,
    sentiment           VARCHAR(20),
    tags                JSONB NOT NULL DEFAULT '[]',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshot_source_captured ON source_snapshots(source_id, captured_at);
CREATE INDEX idx_snapshot_workspace_captured ON source_snapshots(workspace_id, captured_at);

-- ============================================================
-- 5) watchlists
-- ============================================================
CREATE TABLE watchlists (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    watchlist_type      VARCHAR(30) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    competitor_id       UUID REFERENCES competitors(id) ON DELETE SET NULL,
    query_json          JSONB NOT NULL DEFAULT '{}',
    frequency           VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    enabled             BOOLEAN NOT NULL DEFAULT true,
    last_refreshed_at   TIMESTAMPTZ,
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE watchlists
    ADD CONSTRAINT uq_watchlist_workspace_type_name UNIQUE (workspace_id, watchlist_type, name);

-- ============================================================
-- 6) research_jobs
-- ============================================================
CREATE TABLE research_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    job_type                VARCHAR(40) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    requested_by_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    input_json              JSONB NOT NULL DEFAULT '{}',
    started_at              TIMESTAMPTZ,
    finished_at             TIMESTAMPTZ,
    stats_json              JSONB,
    error_message           VARCHAR(700),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_job_workspace_status ON research_jobs(workspace_id, status);

-- ============================================================
-- 7) insights
-- ============================================================
CREATE TABLE insights (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category            VARCHAR(30) NOT NULL,
    insight_type        VARCHAR(60) NOT NULL,
    title               VARCHAR(300) NOT NULL,
    summary             TEXT,
    details_json        JSONB NOT NULL DEFAULT '{}',
    confidence          VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    competitor_id       UUID REFERENCES competitors(id) ON DELETE SET NULL,
    related_keywords    JSONB NOT NULL DEFAULT '[]',
    related_topics      JSONB NOT NULL DEFAULT '[]',
    language            VARCHAR(10) DEFAULT 'en',
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_insight_workspace_status ON insights(workspace_id, status);
CREATE INDEX idx_insight_workspace_category ON insights(workspace_id, category);
CREATE INDEX idx_insight_competitor ON insights(competitor_id);

-- ============================================================
-- 8) insight_evidence
-- ============================================================
CREATE TABLE insight_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id      UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
    snapshot_id     UUID NOT NULL REFERENCES source_snapshots(id) ON DELETE CASCADE,
    citation_text   TEXT,
    citation_url    VARCHAR(500),
    evidence_json   JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE insight_evidence
    ADD CONSTRAINT uq_evidence_insight_snapshot UNIQUE (insight_id, snapshot_id);

-- ============================================================
-- 9) keyword_clusters
-- ============================================================
CREATE TABLE keyword_clusters (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                    VARCHAR(200) NOT NULL,
    intent_type             VARCHAR(40),
    keywords                JSONB NOT NULL DEFAULT '[]',
    metrics_json            JSONB NOT NULL DEFAULT '{}',
    source_snapshot_id      UUID REFERENCES source_snapshots(id) ON DELETE SET NULL,
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE keyword_clusters
    ADD CONSTRAINT uq_cluster_workspace_name UNIQUE (workspace_id, name);

-- ============================================================
-- 10) persona_research
-- ============================================================
CREATE TABLE persona_research (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                    VARCHAR(200) NOT NULL,
    pains                   JSONB NOT NULL DEFAULT '[]',
    objections              JSONB NOT NULL DEFAULT '[]',
    motivations             JSONB NOT NULL DEFAULT '[]',
    channels                JSONB NOT NULL DEFAULT '[]',
    language                VARCHAR(10) DEFAULT 'en',
    sentiment               VARCHAR(20),
    source_snapshot_id      UUID REFERENCES source_snapshots(id) ON DELETE SET NULL,
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE persona_research
    ADD CONSTRAINT uq_persona_workspace_name UNIQUE (workspace_id, name);

-- ============================================================
-- 11) research_links (cross-module mapping)
-- ============================================================
CREATE TABLE research_links (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    research_entity_type    VARCHAR(60) NOT NULL,
    research_entity_id      UUID NOT NULL,
    linked_entity_type      VARCHAR(60) NOT NULL,
    linked_entity_id        UUID NOT NULL,
    relation_type           VARCHAR(30) NOT NULL,
    note                    TEXT,
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE research_links
    ADD CONSTRAINT uq_research_link UNIQUE (workspace_id, research_entity_type, research_entity_id, linked_entity_type, linked_entity_id, relation_type);
CREATE INDEX idx_research_link_research ON research_links(research_entity_type, research_entity_id);
CREATE INDEX idx_research_link_linked ON research_links(linked_entity_type, linked_entity_id);

-- ============================================================
-- 12) research_ai_run_links
-- ============================================================
CREATE TABLE research_ai_run_links (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id            UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    ai_prompt_run_id        UUID REFERENCES ai_prompt_runs(id) ON DELETE SET NULL,
    ai_conversation_id      UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    ai_message_id           UUID REFERENCES ai_messages(id) ON DELETE SET NULL,
    produced_entity_type    VARCHAR(60) NOT NULL,
    produced_entity_id      UUID NOT NULL,
    snapshot_ids            JSONB NOT NULL DEFAULT '[]',
    created_by_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_research_ai_link_workspace ON research_ai_run_links(workspace_id);
CREATE INDEX idx_research_ai_link_produced ON research_ai_run_links(produced_entity_type, produced_entity_id);

-- ============================================================
-- 13) research_digest_reports
-- ============================================================
CREATE TABLE research_digest_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    content_text        TEXT NOT NULL,
    content_json        JSONB NOT NULL DEFAULT '{}',
    ai_prompt_run_id    UUID REFERENCES ai_prompt_runs(id) ON DELETE SET NULL,
    created_by_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_digest_workspace_period ON research_digest_reports(workspace_id, period_start, period_end);

-- ============================================================
-- SEED DATA: AI Prompt Templates for Research
-- ============================================================
INSERT INTO ai_prompt_templates
    (id, scope, org_id, name, description, purpose, output_format,
     system_prompt, user_prompt_template, guardrails_text,
     input_schema_json, output_schema_json,
     created_by_user_id, updated_by_user_id,
     status, version, tags, created_at, updated_at)
VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.snapshot_summarize',
 'Summarize a research snapshot, extracting key points, entities, and sentiment.',
 'SUMMARIZE', 'JSON',
 'You are a research analyst. Summarize the provided snapshot content accurately. Only use information from the provided text. Return structured JSON.',
 E'Analyze the following snapshot and produce a JSON summary.\n\nSnapshot ID: {{snapshotId}}\nSnapshot Type: {{snapshotType}}\nTitle: {{title}}\nLanguage: {{language}}\n\nContent:\n{{rawTextExcerpt}}\n\nReturn JSON with this structure:\n{"summary":"concise summary","keyPoints":["point1","point2"],"entities":["entity1"],"sentiment":"POSITIVE|NEUTRAL|NEGATIVE|MIXED|UNKNOWN","citations":[{"snapshotId":"{{snapshotId}}","evidence":"relevant quote"}]}',
 'Do not invent facts. Only use provided snapshot excerpts. Every insight must include citations referencing snapshotId(s). If insufficient evidence, return empty arrays and explain why in the summary.',
 '{"type":"object","properties":{"snapshotId":{"type":"string"},"title":{"type":"string"},"rawTextExcerpt":{"type":"string"},"snapshotType":{"type":"string"},"language":{"type":"string"}},"required":["snapshotId","rawTextExcerpt"]}',
 '{"type":"object","properties":{"summary":{"type":"string"},"keyPoints":{"type":"array"},"entities":{"type":"array"},"sentiment":{"type":"string"},"citations":{"type":"array"}}}',
 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 'APPROVED', 1, '["research","summarize"]', now(), now()),

('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.extract_competitor_insights',
 'Extract competitor offer, pricing, and positioning insights from snapshots.',
 'EXTRACT', 'JSON',
 'You are a competitive intelligence analyst. Extract structured insights about competitor offers, pricing, and positioning from the provided snapshot excerpts. Only cite information present in the text.',
 E'Analyze the following snapshots for competitor "{{competitorName}}" and extract insights.\n\nRequested insight types: {{insightTypes}}\nLanguage: {{language}}\n\nSnapshots:\n{{snapshotExcerpts}}\n\nReturn JSON:\n{"insights":[{"insightType":"COMPETITOR_OFFER|COMPETITOR_PRICING|COMPETITOR_POSITIONING","title":"...","summary":"...","details":{},"evidence":[{"snapshotId":"...","citationText":"...","quote":"..."}],"confidence":"LOW|MEDIUM|HIGH"}]}',
 'Do not invent facts. Only use provided snapshot excerpts. Every insight must include citations referencing snapshotId(s). If insufficient evidence, return empty insights array and explain why.',
 '{"type":"object","properties":{"competitorName":{"type":"string"},"insightTypes":{"type":"string"},"snapshotExcerpts":{"type":"string"},"language":{"type":"string"}},"required":["competitorName","snapshotExcerpts"]}',
 '{"type":"object","properties":{"insights":{"type":"array"}}}',
 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 'APPROVED', 1, '["research","extract","competitor"]', now(), now()),

('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.cluster_keywords',
 'Cluster a list of keywords by search intent and topic similarity.',
 'CLASSIFY', 'JSON',
 'You are an SEO and search intent specialist. Group the provided keywords into clusters by search intent and semantic similarity. Return structured JSON.',
 E'Cluster the following keywords by intent and topic.\n\nContext: {{context}}\nLanguage: {{language}}\n\nKeywords:\n{{keywords}}\n\nReturn JSON:\n{"clusters":[{"name":"cluster name","intentType":"informational|commercial|transactional|navigational","keywords":["kw1","kw2"],"metrics":{"avgVolume":0,"avgCpc":0,"difficulty":0},"evidence":[{"snapshotId":"...","evidence":"keywords provided"}]}]}',
 'Do not invent facts. Only use provided keywords. If a snapshotId is provided, reference it in evidence. If insufficient data, return fewer clusters.',
 '{"type":"object","properties":{"keywords":{"type":"string"},"context":{"type":"string"},"language":{"type":"string"}},"required":["keywords"]}',
 '{"type":"object","properties":{"clusters":{"type":"array"}}}',
 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 'APPROVED', 1, '["research","keywords","cluster"]', now(), now()),

('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e04', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.draft_persona',
 'Draft an audience persona from review, transcript, and survey snapshot data.',
 'GENERATE', 'JSON',
 'You are a user research specialist. Build an audience persona from the provided snapshot excerpts. Only cite information present in the provided text.',
 E'Create an audience persona named "{{personaName}}" from the following snapshots.\n\nLanguage: {{language}}\n\nSnapshots:\n{{snapshotExcerpts}}\n\nReturn JSON:\n{"name":"{{personaName}}","pains":["pain1"],"objections":["objection1"],"motivations":["motivation1"],"channels":["channel1"],"citations":[{"snapshotId":"...","evidence":"relevant quote"}]}',
 'Do not invent facts. Only use provided snapshot excerpts. Every claim must be backed by at least one citation referencing a snapshotId. If insufficient evidence, return empty arrays.',
 '{"type":"object","properties":{"personaName":{"type":"string"},"snapshotExcerpts":{"type":"string"},"language":{"type":"string"}},"required":["personaName","snapshotExcerpts"]}',
 '{"type":"object","properties":{"name":{"type":"string"},"pains":{"type":"array"},"objections":{"type":"array"},"motivations":{"type":"array"},"channels":{"type":"array"},"citations":{"type":"array"}}}',
 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 'APPROVED', 1, '["research","persona","audience"]', now(), now()),

('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.weekly_digest_narrative',
 'Generate a weekly digest narrative from recent research activity data.',
 'GENERATE', 'JSON',
 'You are a marketing intelligence analyst. Generate a concise weekly digest report from the provided research activity data. Cite snapshot and insight IDs.',
 E'Generate a weekly research digest report.\n\nPeriod: {{periodStart}} to {{periodEnd}}\n\nRecent Snapshots Summary:\n{{recentSnapshots}}\n\nRecent Insights Summary:\n{{recentInsights}}\n\nBrand Context:\n{{brandContext}}\n\nReturn JSON:\n{"title":"Weekly Research Digest","highlights":["highlight1"],"risks":["risk1"],"opportunities":["opportunity1"],"recommendedActions":["action1"],"narrative":"full digest narrative text"}',
 'Do not invent facts. Only reference data provided in the summaries. If no data available, state that clearly.',
 '{"type":"object","properties":{"periodStart":{"type":"string"},"periodEnd":{"type":"string"},"recentSnapshots":{"type":"string"},"recentInsights":{"type":"string"},"brandContext":{"type":"string"}},"required":["periodStart","periodEnd"]}',
 '{"type":"object","properties":{"title":{"type":"string"},"highlights":{"type":"array"},"risks":{"type":"array"},"opportunities":{"type":"array"},"recommendedActions":{"type":"array"},"narrative":{"type":"string"}}}',
 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
 'APPROVED', 1, '["research","digest","weekly"]', now(), now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: AI Workflow Definition for Weekly Digest
-- ============================================================
INSERT INTO ai_workflow_definitions
    (id, scope, org_id, name, description, steps_json, status, created_at, updated_at)
VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e05', 'ORG',
 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
 'research.weekly_digest',
 'Weekly research digest workflow: gathers recent snapshots and insights, then generates a narrative report.',
 '[
   {"type":"TOOL","toolName":"research.listRecentSnapshots","inputTemplate":"{\"days\":7,\"limit\":20}"},
   {"type":"TOOL","toolName":"research.listRecentInsights","inputTemplate":"{\"days\":7,\"status\":\"PUBLISHED\",\"limit\":20}"},
   {"type":"TOOL","toolName":"governance.getEffectiveBrandProfile","inputTemplate":"{}"},
   {"type":"LLM","promptId":"e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e06","inputTemplate":"{\"periodStart\":\"{{periodStart}}\",\"periodEnd\":\"{{periodEnd}}\",\"recentSnapshots\":\"see tool outputs\",\"recentInsights\":\"see tool outputs\",\"brandContext\":\"see tool outputs\"}"}
 ]'::jsonb,
 'APPROVED', now(), now())
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED DATA: New AI Tool Definitions for Research
-- ============================================================
INSERT INTO ai_tool_definitions (name, description, risk_level, input_schema_json, output_schema_json) VALUES
('research.listRecentSnapshots',
 'List recent source snapshots for the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{"days":{"type":"integer","default":7},"limit":{"type":"integer","default":20}}}',
 '{"type":"object","properties":{"items":{"type":"array"}}}'),
('research.listRecentInsights',
 'List recent insights for the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{"days":{"type":"integer","default":7},"status":{"type":"string"},"limit":{"type":"integer","default":20}}}',
 '{"type":"object","properties":{"items":{"type":"array"}}}'),
('research.getSnapshot',
 'Retrieve a single source snapshot by ID.',
 'READ_ONLY',
 '{"type":"object","properties":{"snapshotId":{"type":"string"}},"required":["snapshotId"]}',
 '{"type":"object","properties":{"snapshotId":{"type":"string"},"title":{"type":"string"},"rawText":{"type":"string"}}}'),
('research.getCompetitor',
 'Retrieve a single competitor by ID.',
 'READ_ONLY',
 '{"type":"object","properties":{"competitorId":{"type":"string"}},"required":["competitorId"]}',
 '{"type":"object","properties":{"competitorId":{"type":"string"},"name":{"type":"string"},"websiteUrl":{"type":"string"}}}')
ON CONFLICT (name) DO NOTHING;
