-- Seed Organization
INSERT INTO organizations (id, name, timezone, currency)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Avyukt Digital', 'America/New_York', 'USD');

-- Seed Workspace
INSERT INTO workspaces (id, org_id, name, market)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'US Market', 'US');

-- Seed Users (password: "password" for both, BCrypt-encoded)
INSERT INTO users (id, email, full_name, password_hash, status)
VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'admin@avyukt.com', 'Admin User',
     '$2a$10$HXKFoDf/NiZm0R/rFgPCpOXhM/TaYbL9h0hhQGVJDf6rYjLmgDXi.', 'ACTIVE'),
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'analyst@avyukt.com', 'Analyst User',
     '$2a$10$HXKFoDf/NiZm0R/rFgPCpOXhM/TaYbL9h0hhQGVJDf6rYjLmgDXi.', 'ACTIVE');

-- Seed Memberships
INSERT INTO memberships (id, user_id, org_id, workspace_id, role)
VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'ADMIN'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'ANALYST');

-- Seed Integration Account
INSERT INTO integration_accounts (id, org_id, platform_type, display_name, status, auth_type, scopes_json)
VALUES ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'CHATGPT', 'ChatGPT Ads Account', 'CONNECTED', 'API_KEY', '["ads.read","ads.write"]');

-- Seed Campaign
INSERT INTO conversation_campaigns (id, workspace_id, integration_account_id, name, objective, status, daily_budget, lifetime_budget, start_date, end_date, pacing_mode)
VALUES ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a88', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Spring Launch Campaign', 'AWARENESS', 'DRAFT',
        100.00, 3000.00, '2026-04-01', '2026-06-30', 'STANDARD');

-- Seed Sponsored Unit
INSERT INTO sponsored_units (id, campaign_id, type, title, snippet, cta_text, landing_url, status)
VALUES ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', '20eebc99-9c0b-4ef8-bb6d-6bb9bd380a88',
        'SPONSORED_PLACEMENT', 'Discover AI Marketing', 'Transform your marketing strategy with AI-driven conversational ads.',
        'Learn More', 'https://avyukt.com/ai-marketing', 'DRAFT');
