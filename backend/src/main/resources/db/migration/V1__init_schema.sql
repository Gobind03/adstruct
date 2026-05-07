CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(50),
    currency VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    market VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_workspaces_org_id ON workspaces(org_id);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    workspace_id UUID REFERENCES workspaces(id),
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, org_id, workspace_id)
);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_org_id ON memberships(org_id);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID,
    workspace_id UUID,
    actor_user_id UUID,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE integration_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    platform_type VARCHAR(30) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
    auth_type VARCHAR(20) NOT NULL,
    encrypted_secret_ref VARCHAR(500),
    scopes_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_sync_at TIMESTAMPTZ
);
CREATE INDEX idx_integration_accounts_org_id ON integration_accounts(org_id);

CREATE TABLE integration_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id),
    status VARCHAR(10) NOT NULL,
    message TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_integration_health_account ON integration_health(integration_account_id);

CREATE TABLE conversation_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    integration_account_id UUID NOT NULL REFERENCES integration_accounts(id),
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    daily_budget DECIMAL(15,2),
    lifetime_budget DECIMAL(15,2),
    start_date DATE,
    end_date DATE,
    pacing_mode VARCHAR(20) DEFAULT 'STANDARD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_campaigns_workspace ON conversation_campaigns(workspace_id);
CREATE INDEX idx_campaigns_status ON conversation_campaigns(workspace_id, status);

CREATE TABLE target_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES conversation_campaigns(id) ON DELETE CASCADE,
    intent_type VARCHAR(20) NOT NULL,
    topics_json JSONB,
    geo_json JSONB,
    negative_topics_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_target_sets_campaign ON target_sets(campaign_id);

CREATE TABLE sponsored_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES conversation_campaigns(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(255) NOT NULL,
    snippet VARCHAR(500),
    cta_text VARCHAR(100),
    landing_url VARCHAR(500),
    disclaimer TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sponsored_units_campaign ON sponsored_units(campaign_id);

CREATE TABLE approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    reviewer_user_id UUID,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_approval_workflows_state ON approval_workflows(state);
CREATE INDEX idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id);

CREATE TABLE ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    sponsored_unit_id UUID,
    event_type VARCHAR(30) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    platform_type VARCHAR(30),
    meta_json JSONB,
    session_id VARCHAR(255),
    user_agent VARCHAR(500),
    ip_hash VARCHAR(64)
);
CREATE INDEX idx_ad_events_campaign ON ad_events(campaign_id, event_type, event_time);
CREATE INDEX idx_ad_events_workspace ON ad_events(workspace_id);
