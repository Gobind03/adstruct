-- V6: Dev seed data for Integrations Hub (idempotent via ON CONFLICT)

-- Sample integration resource under the existing ChatGPT Ads account
INSERT INTO integration_resources (id, integration_account_id, resource_type, external_resource_id, display_name, status, meta_json)
VALUES (
    'a10ebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'AD_ACCOUNT',
    'chatgpt-ads-acct-001',
    'Primary ChatGPT Ad Account',
    'ENABLED',
    '{"tier": "standard"}'
) ON CONFLICT DO NOTHING;

-- Map the existing integration account + resource to the US Market workspace
INSERT INTO workspace_integrations (id, workspace_id, integration_account_id, integration_resource_id, enabled, is_default, settings_json)
VALUES (
    'a20ebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
    'a10ebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
    true,
    true,
    '{"defaultAdAccount": "chatgpt-ads-acct-001"}'
) ON CONFLICT DO NOTHING;
