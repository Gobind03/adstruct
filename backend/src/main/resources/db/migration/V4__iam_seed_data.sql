-- V4: Seed data for IAM module (dev only, idempotent via ON CONFLICT)

-- Seed a second workspace
INSERT INTO workspaces (id, org_id, name, market, status)
VALUES ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'India Market', 'IN', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Add org-level membership for admin (ORG_ADMIN at org scope, workspace_id=NULL)
INSERT INTO memberships (id, user_id, org_id, workspace_id, role)
VALUES ('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380b77', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, 'ORG_ADMIN')
ON CONFLICT DO NOTHING;

-- Seed team
INSERT INTO teams (id, org_id, workspace_id, name)
VALUES ('a1eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Engineering')
ON CONFLICT DO NOTHING;

-- Seed team members
INSERT INTO team_members (id, team_id, user_id)
VALUES
    ('a2eebc99-9c0b-4ef8-bb6d-6bb9bd380c22', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
    ('a3eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44')
ON CONFLICT DO NOTHING;

-- Seed pending invite
INSERT INTO invites (id, org_id, workspace_id, email, role, token_hash, status, invited_by_user_id, expires_at)
VALUES ('a4eebc99-9c0b-4ef8-bb6d-6bb9bd380c44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'newuser@example.com', 'EDITOR',
        '$2a$10$dummyHashForDevSeedDataOnly000000000000000000000', 'PENDING',
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        now() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;
