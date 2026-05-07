package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import com.avyukt.marketsuite.ai.domain.AiWorkspaceProviderPreference;
import com.avyukt.marketsuite.ai.domain.LlmProviderType;
import com.avyukt.marketsuite.ai.repo.AiProviderConfigRepository;
import com.avyukt.marketsuite.ai.repo.AiWorkspaceProviderPreferenceRepository;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.common.secret.SecretStore;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.IntegrationStatus;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AiProviderSelectionService {

    private static final List<PlatformType> AI_PLATFORM_TYPES =
            List.of(PlatformType.OPENAI_API, PlatformType.PERPLEXITY_API, PlatformType.CUSTOM_LLM);

    private static final Map<PlatformType, LlmProviderType> PLATFORM_TO_LLM =
            Map.of(
                    PlatformType.OPENAI_API, LlmProviderType.OPENAI,
                    PlatformType.PERPLEXITY_API, LlmProviderType.PERPLEXITY,
                    PlatformType.CUSTOM_LLM, LlmProviderType.CUSTOM_HTTP);

    private static final Map<LlmProviderType, String> DEFAULT_MODELS =
            Map.of(
                    LlmProviderType.OPENAI, "gpt-4o",
                    LlmProviderType.PERPLEXITY, "sonar",
                    LlmProviderType.CUSTOM_HTTP, "default",
                    LlmProviderType.MOCK, "mock-model");

    private final AiProviderConfigRepository providerConfigRepository;
    private final AiWorkspaceProviderPreferenceRepository workspaceProviderPreferenceRepository;
    private final WorkspaceRepository workspaceRepository;
    private final IntegrationAccountRepository integrationAccountRepository;
    private final SecretStore secretStore;
    private final ObjectMapper objectMapper;

    public AiProviderSelectionService(
            AiProviderConfigRepository providerConfigRepository,
            AiWorkspaceProviderPreferenceRepository workspaceProviderPreferenceRepository,
            WorkspaceRepository workspaceRepository,
            IntegrationAccountRepository integrationAccountRepository,
            SecretStore secretStore,
            ObjectMapper objectMapper) {
        this.providerConfigRepository = providerConfigRepository;
        this.workspaceProviderPreferenceRepository = workspaceProviderPreferenceRepository;
        this.workspaceRepository = workspaceRepository;
        this.integrationAccountRepository = integrationAccountRepository;
        this.secretStore = secretStore;
        this.objectMapper = objectMapper;
    }

    public AiProviderConfig resolveProvider(UUID workspaceId, UUID overrideProviderConfigId) {
        if (overrideProviderConfigId != null) {
            AiProviderConfig config =
                    providerConfigRepository
                            .findById(overrideProviderConfigId)
                            .orElseThrow(
                                    () ->
                                            new ResourceNotFoundException(
                                                    "AiProviderConfig", "id", overrideProviderConfigId));
            Workspace workspace =
                    workspaceRepository
                            .findById(workspaceId)
                            .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
            if (!config.getOrg().getId().equals(workspace.getOrg().getId())) {
                throw new BusinessException("Provider config does not belong to this workspace's organization");
            }
            if (!config.isEnabled()) {
                throw new BusinessException("Provider config is disabled");
            }
            return config;
        }

        Optional<AiWorkspaceProviderPreference> existingPref =
                workspaceProviderPreferenceRepository.findByWorkspaceIdAndIsDefaultTrue(workspaceId);
        if (existingPref.isPresent()) {
            AiProviderConfig config = existingPref.get().getProviderConfig();
            if (config != null && config.isEnabled()) {
                return config;
            }
        }

        return autoProvisionFromIntegrations(workspaceId);
    }

    private AiProviderConfig autoProvisionFromIntegrations(UUID workspaceId) {
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        Organization org = workspace.getOrg();
        UUID orgId = org.getId();

        List<AiProviderConfig> existingConfigs = providerConfigRepository.findByOrgIdAndEnabled(orgId, true);
        if (!existingConfigs.isEmpty()) {
            AiProviderConfig config = existingConfigs.get(0);
            log.info("Auto-linking existing AiProviderConfig [{}] (type={}) as default for workspace [{}]",
                    config.getId(), config.getProviderType(), workspaceId);
            createWorkspacePreference(workspace, config);
            return config;
        }

        List<IntegrationAccount> aiAccounts = integrationAccountRepository
                .findByOrgIdAndPlatformTypeInAndStatus(orgId, AI_PLATFORM_TYPES, IntegrationStatus.CONNECTED);

        if (!aiAccounts.isEmpty()) {
            IntegrationAccount account = aiAccounts.get(0);
            LlmProviderType llmType = PLATFORM_TO_LLM.getOrDefault(account.getPlatformType(), LlmProviderType.OPENAI);
            String defaultModel = DEFAULT_MODELS.getOrDefault(llmType, "gpt-4o");

            log.info("Auto-provisioning AiProviderConfig from IntegrationAccount [{}] (platform={}, llmType={}) for workspace [{}]",
                    account.getId(), account.getPlatformType(), llmType, workspaceId);

            AiProviderConfig config = AiProviderConfig.builder()
                    .org(org)
                    .integrationAccount(account)
                    .providerType(llmType)
                    .defaultModel(defaultModel)
                    .build();
            config = providerConfigRepository.save(config);
            createWorkspacePreference(workspace, config);
            return config;
        }

        log.warn("No AI-compatible integration accounts found for org [{}]. Falling back to MOCK provider.", orgId);
        return createMockProvider(org, workspace);
    }

    private AiProviderConfig createMockProvider(Organization org, Workspace workspace) {
        List<AiProviderConfig> mockConfigs = providerConfigRepository.findByOrgIdAndEnabled(org.getId(), true);
        Optional<AiProviderConfig> existingMock = mockConfigs.stream()
                .filter(c -> c.getProviderType() == LlmProviderType.MOCK)
                .findFirst();
        if (existingMock.isPresent()) {
            createWorkspacePreference(workspace, existingMock.get());
            return existingMock.get();
        }

        IntegrationAccount stubAccount = IntegrationAccount.builder()
                .org(org)
                .platformType(PlatformType.CUSTOM_LLM)
                .displayName("Mock AI Provider (auto-created)")
                .status(IntegrationStatus.CONNECTED)
                .authType(com.avyukt.marketsuite.integration.domain.AuthType.API_KEY)
                .scopesJson("[]")
                .build();
        stubAccount = integrationAccountRepository.save(stubAccount);

        AiProviderConfig config = AiProviderConfig.builder()
                .org(org)
                .integrationAccount(stubAccount)
                .providerType(LlmProviderType.MOCK)
                .defaultModel("mock-model")
                .build();
        config = providerConfigRepository.save(config);
        createWorkspacePreference(workspace, config);
        return config;
    }

    private void createWorkspacePreference(Workspace workspace, AiProviderConfig config) {
        Optional<AiWorkspaceProviderPreference> existing =
                workspaceProviderPreferenceRepository.findByWorkspaceIdAndIsDefaultTrue(workspace.getId());
        if (existing.isPresent()) {
            return;
        }
        AiWorkspaceProviderPreference pref = AiWorkspaceProviderPreference.builder()
                .workspace(workspace)
                .providerConfig(config)
                .isDefault(true)
                .build();
        workspaceProviderPreferenceRepository.save(pref);
        log.info("Created default AiWorkspaceProviderPreference for workspace [{}] → provider [{}] (type={})",
                workspace.getId(), config.getId(), config.getProviderType());
    }

    @Transactional(readOnly = true)
    public void validateModelAllowed(UUID workspaceId, UUID providerConfigId, String model) {
        if (model == null || model.isBlank()) {
            throw new BusinessException("Model is required");
        }
        List<AiWorkspaceProviderPreference> prefs =
                workspaceProviderPreferenceRepository.findByWorkspaceId(workspaceId);
        AiWorkspaceProviderPreference match =
                prefs.stream()
                        .filter(p -> p.getProviderConfig() != null && providerConfigId.equals(p.getProviderConfig().getId()))
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                "No workspace preference found for provider config: " + providerConfigId));

        List<String> allowed = parseAllowedModels(match.getAllowedModels());
        if (allowed.isEmpty()) {
            return;
        }
        if (!allowed.contains(model)) {
            throw new BusinessException("Model '" + model + "' is not allowed for this workspace provider preference");
        }
    }

    @Transactional(readOnly = true)
    public String resolveApiKey(AiProviderConfig config) {
        if (config.getIntegrationAccount() == null) {
            throw new BusinessException("Provider config has no integration account for API credentials");
        }
        String ref = config.getIntegrationAccount().getSecretRef();
        if (ref == null || ref.isBlank()) {
            throw new BusinessException("Integration account has no secret reference");
        }
        String key = secretStore.retrieve(ref);
        if (key == null) {
            throw new BusinessException("API key not found in secret store for ref: " + ref);
        }
        return key;
    }

    private List<String> parseAllowedModels(String allowedModelsJson) {
        if (allowedModelsJson == null || allowedModelsJson.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(allowedModelsJson);
            if (!root.isArray()) {
                return List.of();
            }
            List<String> out = new ArrayList<>();
            for (JsonNode n : root) {
                if (n != null && n.isTextual()) {
                    String t = n.asText();
                    if (t != null && !t.isBlank()) {
                        out.add(t);
                    }
                }
            }
            return out;
        } catch (Exception e) {
            log.warn("Could not parse allowedModels JSON; treating as empty (all models allowed): {}", e.getMessage());
            return List.of();
        }
    }
}
