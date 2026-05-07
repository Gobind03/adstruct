-- ============================================================
-- Add LLM provider entries to integration_providers so that
-- IntegrationService.create() can look them up by platform_type.
-- Uses ON CONFLICT to be idempotent with V10 on fresh databases.
-- ============================================================
INSERT INTO integration_providers (platform_type, category, display_name, auth_type, capabilities_json, docs_url) VALUES
('OPENAI_API',     'OTHER', 'OpenAI API',              'API_KEY', '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":false,"supportsLlm":true}', 'https://platform.openai.com/docs/api-reference'),
('PERPLEXITY_API', 'OTHER', 'Perplexity API',          'API_KEY', '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":false,"supportsLlm":true}', 'https://docs.perplexity.ai/api-reference'),
('CUSTOM_LLM',     'OTHER', 'Custom LLM Endpoint',     'API_KEY', '{"supportsAds":false,"supportsPublish":false,"supportsWebhooks":false,"supportsSync":false,"supportsLlm":true}', NULL)
ON CONFLICT (platform_type) DO NOTHING;
