-- V9: Brand & Content Governance module

-- ============================================================
-- 1) org_brand_profiles
-- ============================================================
CREATE TABLE org_brand_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    display_name        VARCHAR(160) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    primary_color       VARCHAR(7),
    secondary_color     VARCHAR(7),
    accent_color        VARCHAR(7),
    font_primary        VARCHAR(80),
    font_secondary      VARCHAR(80),
    logo_asset_id       UUID,
    voice_tone          VARCHAR(30) NOT NULL DEFAULT 'PROFESSIONAL',
    voice_guidelines_text TEXT,
    do_list_text        TEXT,
    dont_list_text      TEXT,
    default_language    VARCHAR(12) NOT NULL DEFAULT 'en',
    supported_languages JSONB NOT NULL DEFAULT '["en"]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_brand_profile_org UNIQUE (org_id)
);

CREATE INDEX idx_org_brand_status ON org_brand_profiles(status);

-- ============================================================
-- 2) workspace_brand_profiles
-- ============================================================
CREATE TABLE workspace_brand_profiles (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    org_brand_profile_id UUID NOT NULL REFERENCES org_brand_profiles(id) ON DELETE CASCADE,
    status               VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    overrides_json       JSONB NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ws_brand_profile_ws UNIQUE (workspace_id)
);

CREATE INDEX idx_ws_brand_status ON workspace_brand_profiles(status);

-- ============================================================
-- 3) brand_assets
-- ============================================================
CREATE TABLE brand_assets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope         VARCHAR(20) NOT NULL,
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name          VARCHAR(140) NOT NULL,
    asset_type    VARCHAR(40) NOT NULL,
    file_url      VARCHAR(500) NOT NULL,
    checksum      VARCHAR(80),
    width         INT,
    height        INT,
    mime_type     VARCHAR(80),
    tags          JSONB NOT NULL DEFAULT '[]',
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_asset_org_ws ON brand_assets(org_id, workspace_id);
CREATE INDEX idx_brand_asset_status ON brand_assets(status);

-- Add FK from org_brand_profiles.logo_asset_id now that brand_assets exists
ALTER TABLE org_brand_profiles
    ADD CONSTRAINT fk_org_brand_logo FOREIGN KEY (logo_asset_id) REFERENCES brand_assets(id) ON DELETE SET NULL;

-- ============================================================
-- 4) brand_rule_sets
-- ============================================================
CREATE TABLE brand_rule_sets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope         VARCHAR(20) NOT NULL,
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name          VARCHAR(160) NOT NULL,
    domain        VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    description   TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_ruleset_org_ws_name UNIQUE (org_id, workspace_id, name)
);

CREATE INDEX idx_ruleset_scope_status ON brand_rule_sets(scope, status);

-- ============================================================
-- 5) brand_rules
-- ============================================================
CREATE TABLE brand_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_set_id     UUID NOT NULL REFERENCES brand_rule_sets(id) ON DELETE CASCADE,
    rule_type       VARCHAR(40) NOT NULL,
    severity        VARCHAR(10) NOT NULL,
    name            VARCHAR(160) NOT NULL,
    description     TEXT,
    pattern         VARCHAR(500),
    parameters_json JSONB NOT NULL DEFAULT '{}',
    applies_to_json JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rule_ruleset ON brand_rules(rule_set_id);
CREATE INDEX idx_rule_type_severity ON brand_rules(rule_type, severity);

-- ============================================================
-- 6) disclaimers
-- ============================================================
CREATE TABLE disclaimers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope         VARCHAR(20) NOT NULL,
    org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    key           VARCHAR(80) NOT NULL,
    title         VARCHAR(160) NOT NULL,
    default_text  TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_disclaimer_org_ws_key UNIQUE (org_id, workspace_id, key)
);

CREATE INDEX idx_disclaimer_scope_status ON disclaimers(scope, status);

-- ============================================================
-- 7) disclaimer_localizations
-- ============================================================
CREATE TABLE disclaimer_localizations (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disclaimer_id  UUID NOT NULL REFERENCES disclaimers(id) ON DELETE CASCADE,
    language       VARCHAR(12) NOT NULL,
    text           TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_disclaimer_loc_lang UNIQUE (disclaimer_id, language)
);

CREATE INDEX idx_disclaimer_loc_language ON disclaimer_localizations(language);

-- ============================================================
-- 8) templates
-- ============================================================
CREATE TABLE templates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope                 VARCHAR(20) NOT NULL,
    org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workspace_id          UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    template_type         VARCHAR(30) NOT NULL,
    name                  VARCHAR(160) NOT NULL,
    description           TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    content_json          JSONB NOT NULL,
    tags                  JSONB NOT NULL DEFAULT '[]',
    version               INT NOT NULL DEFAULT 1,
    parent_template_id    UUID REFERENCES templates(id) ON DELETE SET NULL,
    rule_set_id           UUID REFERENCES brand_rule_sets(id) ON DELETE SET NULL,
    default_disclaimer_ids JSONB NOT NULL DEFAULT '[]',
    created_by_user_id    UUID NOT NULL REFERENCES users(id),
    updated_by_user_id    UUID NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_scope_type_status ON templates(scope, template_type, status);
CREATE INDEX idx_template_ruleset ON templates(rule_set_id);

-- ============================================================
-- 9) template_usages
-- ============================================================
CREATE TABLE template_usages (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id          UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    workspace_id         UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    used_in_entity_type  VARCHAR(60) NOT NULL,
    used_in_entity_id    UUID NOT NULL,
    used_by_user_id      UUID NOT NULL REFERENCES users(id),
    used_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_usage_template ON template_usages(template_id);
CREATE INDEX idx_template_usage_entity ON template_usages(used_in_entity_type, used_in_entity_id);

-- ============================================================
-- 10) platform_constraints
-- ============================================================
CREATE TABLE platform_constraints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_type   VARCHAR(30) NOT NULL,
    constraint_type VARCHAR(30) NOT NULL,
    value_json      JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_platform_constraint UNIQUE (platform_type, constraint_type)
);

-- ============================================================
-- 11) governance_check_runs
-- ============================================================
CREATE TABLE governance_check_runs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type        VARCHAR(60) NOT NULL,
    entity_id          UUID NOT NULL,
    rule_set_id        UUID REFERENCES brand_rule_sets(id) ON DELETE SET NULL,
    platform_type      VARCHAR(30),
    language           VARCHAR(12),
    status             VARCHAR(30) NOT NULL,
    findings_json      JSONB NOT NULL DEFAULT '[]',
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkrun_entity ON governance_check_runs(entity_type, entity_id);
CREATE INDEX idx_checkrun_workspace ON governance_check_runs(workspace_id);

-- ============================================================
-- Seed: baseline platform constraints
-- ============================================================
INSERT INTO platform_constraints (platform_type, constraint_type, value_json) VALUES
    ('X', 'TEXT_LENGTH', '{"maxLength": 280}'),
    ('META', 'TEXT_LENGTH', '{"recommendedLength": 125, "maxLength": 63206}'),
    ('LINKEDIN', 'TEXT_LENGTH', '{"maxLength": 3000}'),
    ('GOOGLE_ADS', 'TEXT_LENGTH', '{"headlineMax": 30, "descriptionMax": 90}'),
    ('META', 'HASHTAG_LIMIT', '{"maxHashtags": 30}'),
    ('X', 'HASHTAG_LIMIT', '{"recommendedHashtags": 3}'),
    ('LINKEDIN', 'HASHTAG_LIMIT', '{"recommendedHashtags": 5}'),
    ('TIKTOK', 'TEXT_LENGTH', '{"captionMax": 2200}'),
    ('PINTEREST', 'TEXT_LENGTH', '{"titleMax": 100, "descriptionMax": 500}')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: org brand profile for dev seed org
-- ============================================================
INSERT INTO org_brand_profiles (id, org_id, display_name, status, voice_tone, default_language, supported_languages)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Avyukt Brand',
    'ACTIVE',
    'PROFESSIONAL',
    'en',
    '["en", "en-IN"]'
) ON CONFLICT DO NOTHING;
