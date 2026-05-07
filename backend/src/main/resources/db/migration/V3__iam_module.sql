-- V3: IAM Module - Workspace & Account Management

-- 1. Add status column to organizations
ALTER TABLE organizations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX idx_org_status ON organizations(status);

-- 2. Add status column to workspaces
ALTER TABLE workspaces ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX idx_ws_status ON workspaces(status);

-- 3. Add unique constraint on workspace name per org
ALTER TABLE workspaces ADD CONSTRAINT uq_workspace_org_name UNIQUE(org_id, name);

-- 4. Make password_hash nullable (for invited users)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 5. Update role values: ADMIN -> ORG_ADMIN
UPDATE memberships SET role = 'ORG_ADMIN' WHERE role = 'ADMIN';

-- 6. Update user status values for new enum
UPDATE users SET status = 'DISABLED' WHERE status IN ('INACTIVE', 'SUSPENDED');

-- 7. Fix membership unique constraint for NULL workspace_id
-- PostgreSQL treats NULLs as distinct in UNIQUE constraints,
-- so we need partial unique indexes
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_org_id_workspace_id_key;
CREATE UNIQUE INDEX uq_membership_org ON memberships(user_id, org_id) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX uq_membership_ws ON memberships(user_id, org_id, workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_membership_org_ws ON memberships(org_id, workspace_id);

-- 8. Create teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_team_org_ws_name UNIQUE(org_id, workspace_id, name)
);

-- 9. Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_team_member UNIQUE(team_id, user_id)
);

-- 10. Create invites table
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    email VARCHAR(190) NOT NULL,
    role VARCHAR(30) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    invited_by_user_id UUID REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_invite_org_ws_status ON invites(org_id, workspace_id, status);
CREATE INDEX idx_invite_email ON invites(email);

-- 11. Add additional audit_logs indexes
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
