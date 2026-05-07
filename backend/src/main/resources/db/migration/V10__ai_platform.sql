-- V10: AI Agent Marketing / LLM Platform Layer

-- ============================================================
-- 1) ai_provider_configs
-- ============================================================
CREATE TABLE ai_provider_configs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_account_id  UUID NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
    provider_type           VARCHAR(30) NOT NULL,
    default_model           VARCHAR(80) NOT NULL,
    endpoint_base_url       VARCHAR(300),
    request_timeout_ms      INT NOT NULL DEFAULT 30000,
    max_tokens              INT NOT NULL DEFAULT 2048,
    temperature             NUMERIC(3,2) NOT NULL DEFAULT 0.40,
    enabled                 BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_provider_integration UNIQUE (integration_account_id)
);

CREATE INDEX idx_ai_provider_org_enabled ON ai_provider_configs(org_id, enabled);

-- ============================================================
-- 2) ai_workspace_provider_preferences
-- ============================================================
CREATE TABLE ai_workspace_provider_preferences (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_config_id  UUID NOT NULL REFERENCES ai_provider_configs(id) ON DELETE CASCADE,
    is_default          BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_models      JSONB NOT NULL DEFAULT '[]',
    policy_json         JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_ws_provider UNIQUE (workspace_id, provider_config_id)
);

CREATE INDEX idx_ai_ws_provider_workspace ON ai_workspace_provider_preferences(workspace_id);

-- ============================================================
-- 3) ai_prompt_templates
-- ============================================================
CREATE TABLE ai_prompt_templates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope                VARCHAR(20) NOT NULL,
    org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id         UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name                 VARCHAR(160) NOT NULL,
    description          TEXT,
    purpose              VARCHAR(30) NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    output_format        VARCHAR(10) NOT NULL DEFAULT 'TEXT',
    input_schema_json    JSONB NOT NULL DEFAULT '{}',
    output_schema_json   JSONB NOT NULL DEFAULT '{}',
    system_prompt        TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    guardrails_text      TEXT,
    tags                 JSONB NOT NULL DEFAULT '[]',
    version              INT NOT NULL DEFAULT 1,
    parent_template_id   UUID,
    created_by_user_id   UUID NOT NULL REFERENCES users(id),
    updated_by_user_id   UUID NOT NULL REFERENCES users(id),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_prompt_name_version UNIQUE (org_id, workspace_id, name, version)
);

CREATE INDEX idx_prompt_scope_status ON ai_prompt_templates(scope, status);
CREATE INDEX idx_prompt_purpose ON ai_prompt_templates(purpose);

-- ============================================================
-- 4) ai_prompt_runs
-- ============================================================
CREATE TABLE ai_prompt_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    prompt_template_id  UUID NOT NULL REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
    provider_config_id  UUID NOT NULL REFERENCES ai_provider_configs(id),
    model               VARCHAR(80) NOT NULL,
    input_json          JSONB NOT NULL,
    output_text         TEXT,
    output_json         JSONB,
    token_usage_json    JSONB NOT NULL DEFAULT '{}',
    latency_ms          INT,
    status              VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    error_message       VARCHAR(700),
    created_by_user_id  UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prompt_run_workspace ON ai_prompt_runs(workspace_id);
CREATE INDEX idx_prompt_run_template ON ai_prompt_runs(prompt_template_id);

-- ============================================================
-- 5) ai_conversations
-- ============================================================
CREATE TABLE ai_conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title               VARCHAR(200) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    agent_mode          VARCHAR(20) NOT NULL DEFAULT 'TOOL_ASSISTED',
    provider_config_id  UUID REFERENCES ai_provider_configs(id),
    model               VARCHAR(80),
    context_json        JSONB NOT NULL DEFAULT '{}',
    created_by_user_id  UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversation_workspace_status ON ai_conversations(workspace_id, status);

-- ============================================================
-- 6) ai_messages
-- ============================================================
CREATE TABLE ai_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL,
    content             TEXT NOT NULL,
    content_json        JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_user_id  UUID REFERENCES users(id)
);

CREATE INDEX idx_message_conversation_time ON ai_messages(conversation_id, created_at);

-- ============================================================
-- 7) ai_citations
-- ============================================================
CREATE TABLE ai_citations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES ai_messages(id) ON DELETE CASCADE,
    citation_type   VARCHAR(30) NOT NULL,
    reference_type  VARCHAR(60) NOT NULL,
    reference_id    UUID,
    url             VARCHAR(700),
    label           VARCHAR(200),
    meta_json       JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citation_message ON ai_citations(message_id);

-- ============================================================
-- 8) ai_tool_definitions
-- ============================================================
CREATE TABLE ai_tool_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(120) NOT NULL,
    description         TEXT NOT NULL,
    risk_level          VARCHAR(20) NOT NULL,
    input_schema_json   JSONB NOT NULL DEFAULT '{}',
    output_schema_json  JSONB NOT NULL DEFAULT '{}',
    enabled             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_tool_name UNIQUE (name)
);

-- ============================================================
-- 9) ai_tool_calls
-- ============================================================
CREATE TABLE ai_tool_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    message_id      UUID REFERENCES ai_messages(id) ON DELETE SET NULL,
    tool_name       VARCHAR(120) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    input_json      JSONB NOT NULL,
    output_json     JSONB,
    error_message   VARCHAR(700),
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_toolcall_conversation ON ai_tool_calls(conversation_id);
CREATE INDEX idx_toolcall_status ON ai_tool_calls(status);

-- ============================================================
-- 10) ai_action_proposals
-- ============================================================
CREATE TABLE ai_action_proposals (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id      UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    title                VARCHAR(220) NOT NULL,
    description          TEXT,
    action_type          VARCHAR(80) NOT NULL,
    target_entity_type   VARCHAR(60) NOT NULL,
    target_entity_id     UUID,
    payload_json         JSONB NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    requested_by_user_id UUID NOT NULL REFERENCES users(id),
    reviewed_by_user_id  UUID REFERENCES users(id),
    review_notes         VARCHAR(500),
    executed_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_workspace_status ON ai_action_proposals(workspace_id, status);
CREATE INDEX idx_action_conversation ON ai_action_proposals(conversation_id);

-- ============================================================
-- 11) ai_safety_policies
-- ============================================================
CREATE TABLE ai_safety_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    policy_json     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ai_safety_workspace UNIQUE (workspace_id)
);

-- ============================================================
-- 12) ai_redaction_rules
-- ============================================================
CREATE TABLE ai_redaction_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(140) NOT NULL,
    pattern         VARCHAR(500) NOT NULL,
    replacement     VARCHAR(120) NOT NULL DEFAULT '[REDACTED]',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_redaction_workspace_enabled ON ai_redaction_rules(workspace_id, enabled);

-- ============================================================
-- 13) ai_workflow_definitions
-- ============================================================
CREATE TABLE ai_workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope           VARCHAR(20) NOT NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name            VARCHAR(160) NOT NULL,
    description     TEXT,
    steps_json      JSONB NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14) ai_workflow_runs
-- ============================================================
CREATE TABLE ai_workflow_runs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_definition_id   UUID NOT NULL REFERENCES ai_workflow_definitions(id) ON DELETE CASCADE,
    workspace_id             UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    conversation_id          UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
    input_json               JSONB NOT NULL DEFAULT '{}',
    output_json              JSONB,
    status                   VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    error_message            VARCHAR(700),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED DATA: Tool Definitions
-- ============================================================
INSERT INTO ai_tool_definitions (name, description, risk_level, input_schema_json, output_schema_json) VALUES
('research.searchInsights',
 'Search research insights and snapshots by keyword.',
 'READ_ONLY',
 '{"type":"object","properties":{"q":{"type":"string"},"limit":{"type":"integer","default":10}},"required":["q"]}',
 '{"type":"object","properties":{"items":{"type":"array","items":{"type":"object","properties":{"insightId":{"type":"string"},"title":{"type":"string"},"summary":{"type":"string"}}}}}}'),

('governance.getEffectiveBrandProfile',
 'Retrieve the effective brand profile for the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{}}',
 '{"type":"object","properties":{"displayName":{"type":"string"},"voiceTone":{"type":"string"},"languages":{"type":"array","items":{"type":"string"}}}}'),

('governance.runCheck',
 'Run governance compliance checks against content.',
 'READ_ONLY',
 '{"type":"object","properties":{"entityType":{"type":"string"},"entityId":{"type":"string"},"contentPayloadJson":{"type":"object"},"platformType":{"type":"string"},"language":{"type":"string"}},"required":["entityType","contentPayloadJson"]}',
 '{"type":"object","properties":{"status":{"type":"string","enum":["PASS","WARN","FAIL"]},"findings":{"type":"array"}}}'),

('integrations.listWorkspaceIntegrations',
 'List all connected integration accounts for the current workspace.',
 'READ_ONLY',
 '{"type":"object","properties":{}}',
 '{"type":"object","properties":{"items":{"type":"array","items":{"type":"object","properties":{"platformType":{"type":"string"},"accountId":{"type":"string"},"enabled":{"type":"boolean"}}}}}}'),

('ads.listConversationCampaigns',
 'List conversational ad campaigns with optional status filter.',
 'READ_ONLY',
 '{"type":"object","properties":{"status":{"type":"string"},"limit":{"type":"integer","default":20}}}',
 '{"type":"object","properties":{"items":{"type":"array"}}}'),

('actions.propose',
 'Propose a write action that requires human approval before execution.',
 'SAFE_WRITE',
 '{"type":"object","properties":{"title":{"type":"string"},"actionType":{"type":"string"},"targetEntityType":{"type":"string"},"targetEntityId":{"type":"string"},"payloadJson":{"type":"object"}},"required":["title","actionType","targetEntityType","payloadJson"]}',
 '{"type":"object","properties":{"proposalId":{"type":"string"}}}');

-- ============================================================
-- SEED DATA: Default Safety Policies (for existing workspaces)
-- ============================================================
INSERT INTO ai_safety_policies (workspace_id, policy_json)
SELECT id, '{
  "bannedPhrases": ["password", "api key", "secret key", "access token"],
  "blockedTopics": ["medical diagnosis", "financial advice", "legal counsel"],
  "allowedTools": ["research.*", "governance.*", "integrations.*", "ads.*", "actions.propose"],
  "maxToolCallsPerTurn": 3,
  "requireApprovalForWrites": true
}'::jsonb
FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
