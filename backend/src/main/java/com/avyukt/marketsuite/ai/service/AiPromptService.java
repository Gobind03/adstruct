package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.ai.domain.AiPromptTemplate;
import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.avyukt.marketsuite.ai.domain.OutputFormat;
import com.avyukt.marketsuite.ai.domain.PromptScope;
import com.avyukt.marketsuite.ai.domain.PromptStatus;
import com.avyukt.marketsuite.ai.domain.SafetyDecision;
import com.avyukt.marketsuite.ai.repo.AiPromptRunRepository;
import com.avyukt.marketsuite.ai.repo.AiPromptTemplateRepository;
import com.avyukt.marketsuite.ai.service.gateway.LlmGatewayRouter;
import com.avyukt.marketsuite.ai.service.gateway.LlmMessage;
import com.avyukt.marketsuite.ai.service.gateway.LlmRequest;
import com.avyukt.marketsuite.ai.service.gateway.LlmResponse;
import com.avyukt.marketsuite.ai.service.safety.AiSafetyService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AiPromptService {

    private final AiPromptTemplateRepository promptTemplateRepository;
    private final AiPromptRunRepository promptRunRepository;
    private final AiProviderSelectionService providerSelectionService;
    private final LlmGatewayRouter llmGatewayRouter;
    private final AiSafetyService safetyService;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final OrganizationRepository organizationRepository;
    private final ObjectMapper objectMapper;

    public AiPromptService(
            AiPromptTemplateRepository promptTemplateRepository,
            AiPromptRunRepository promptRunRepository,
            AiProviderSelectionService providerSelectionService,
            LlmGatewayRouter llmGatewayRouter,
            AiSafetyService safetyService,
            AuditService auditService,
            UserRepository userRepository,
            WorkspaceRepository workspaceRepository,
            OrganizationRepository organizationRepository,
            ObjectMapper objectMapper) {
        this.promptTemplateRepository = promptTemplateRepository;
        this.promptRunRepository = promptRunRepository;
        this.providerSelectionService = providerSelectionService;
        this.llmGatewayRouter = llmGatewayRouter;
        this.safetyService = safetyService;
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
        this.organizationRepository = organizationRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<AiPromptTemplate> list(
            UUID orgId, PromptScope scope, LlmCallPurpose purpose, PromptStatus status) {
        List<AiPromptTemplate> base =
                orgId != null ? promptTemplateRepository.findByOrgId(orgId) : new ArrayList<>();
        return base.stream()
                .filter(t -> scope == null || t.getScope() == scope)
                .filter(t -> purpose == null || t.getPurpose() == purpose)
                .filter(t -> status == null || t.getStatus() == status)
                .toList();
    }

    @Transactional(readOnly = true)
    public AiPromptTemplate get(UUID promptId) {
        return promptTemplateRepository
                .findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("AiPromptTemplate", "id", promptId));
    }

    public AiPromptTemplate create(UUID orgId, AiPromptTemplate template) {
        UUID userId = SecurityUtils.currentUserId();
        Organization org =
                organizationRepository
                        .findById(orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
        AppUser user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        template.setOrg(org);
        template.setCreatedByUser(user);
        template.setUpdatedByUser(user);
        if (template.getStatus() == null) {
            template.setStatus(PromptStatus.DRAFT);
        }
        if (template.getOutputFormat() == null) {
            template.setOutputFormat(OutputFormat.TEXT);
        }

        AiPromptTemplate saved = promptTemplateRepository.save(template);
        auditService.log(
                orgId,
                template.getWorkspace() != null ? template.getWorkspace().getId() : null,
                userId,
                "AI_PROMPT_CREATE",
                "AiPromptTemplate",
                saved.getId(),
                null,
                summarizeTemplate(saved));
        return saved;
    }

    public AiPromptTemplate patch(UUID promptId, Map<String, Object> updates) {
        UUID userId = SecurityUtils.currentUserId();
        AiPromptTemplate existing =
                promptTemplateRepository
                        .findById(promptId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiPromptTemplate", "id", promptId));
        String before = summarizeTemplate(existing);

        AppUser user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));
        existing.setUpdatedByUser(user);

        if (updates != null) {
            applyIfPresent(updates, "name", String.class, existing::setName);
            applyIfPresent(updates, "description", String.class, existing::setDescription);
            applyIfPresent(updates, "systemPrompt", String.class, existing::setSystemPrompt);
            applyIfPresent(updates, "userPromptTemplate", String.class, existing::setUserPromptTemplate);
            applyIfPresent(updates, "guardrailsText", String.class, existing::setGuardrailsText);
            applyIfPresent(updates, "tags", String.class, existing::setTags);
            if (updates.containsKey("outputFormat") && updates.get("outputFormat") != null) {
                try {
                    existing.setOutputFormat(OutputFormat.valueOf(String.valueOf(updates.get("outputFormat"))));
                } catch (IllegalArgumentException ex) {
                    throw new BusinessException("Invalid outputFormat: " + updates.get("outputFormat"));
                }
            }
            if (updates.containsKey("purpose") && updates.get("purpose") != null) {
                try {
                    existing.setPurpose(LlmCallPurpose.valueOf(String.valueOf(updates.get("purpose"))));
                } catch (IllegalArgumentException ex) {
                    throw new BusinessException("Invalid purpose: " + updates.get("purpose"));
                }
            }
        }

        AiPromptTemplate saved = promptTemplateRepository.save(existing);
        auditService.log(
                saved.getOrg().getId(),
                saved.getWorkspace() != null ? saved.getWorkspace().getId() : null,
                userId,
                "AI_PROMPT_PATCH",
                "AiPromptTemplate",
                saved.getId(),
                before,
                summarizeTemplate(saved));
        return saved;
    }

    public AiPromptTemplate submit(UUID promptId) {
        return setStatusAndAudit(promptId, PromptStatus.APPROVED, "AI_PROMPT_SUBMIT");
    }

    public AiPromptTemplate approve(UUID promptId) {
        return setStatusAndAudit(promptId, PromptStatus.APPROVED, "AI_PROMPT_APPROVE");
    }

    public AiPromptTemplate archive(UUID promptId) {
        return setStatusAndAudit(promptId, PromptStatus.ARCHIVED, "AI_PROMPT_ARCHIVE");
    }

    public AiPromptRun run(
            UUID workspaceId,
            UUID promptId,
            String inputJson,
            UUID providerOverrideId,
            String modelOverride) {
        UUID userId = SecurityUtils.currentUserId();
        Workspace workspace =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));

        AiPromptTemplate template = get(promptId);

        if (safetyService.classifySafety(workspaceId, inputJson != null ? inputJson : "") == SafetyDecision.BLOCK) {
            throw new BusinessException("Input blocked by workspace safety policy");
        }

        JsonNode inputNode = parseInputJson(inputJson);
        String expandedUser = expandTemplate(template.getUserPromptTemplate(), inputNode);
        String redactedUser = safetyService.redactSecrets(workspaceId, expandedUser);

        AiProviderConfig provider = providerSelectionService.resolveProvider(workspaceId, providerOverrideId);
        String model =
                modelOverride != null && !modelOverride.isBlank() ? modelOverride : provider.getDefaultModel();
        providerSelectionService.validateModelAllowed(workspaceId, provider.getId(), model);

        String secretRef =
                provider.getIntegrationAccount() != null
                        ? provider.getIntegrationAccount().getSecretRef()
                        : null;
        Map<String, String> metadata = new LinkedHashMap<>();
        if (secretRef != null && !secretRef.isBlank()) {
            metadata.put("secretRef", secretRef);
        }
        if (provider.getEndpointBaseUrl() != null && !provider.getEndpointBaseUrl().isBlank()) {
            metadata.put("endpointBaseUrl", provider.getEndpointBaseUrl());
        }
        if (template.getOutputFormat() != null) {
            metadata.put("outputFormat", template.getOutputFormat().name());
        }

        String system = template.getSystemPrompt() != null ? template.getSystemPrompt() : "";
        if (template.getGuardrailsText() != null && !template.getGuardrailsText().isBlank()) {
            system = system + "\n\nGuardrails:\n" + template.getGuardrailsText();
        }
        String redactedSystem = safetyService.redactSecrets(workspaceId, system);

        List<LlmMessage> messages =
                List.of(
                        new LlmMessage("system", redactedSystem),
                        new LlmMessage("user", redactedUser));

        long start = System.currentTimeMillis();
        LlmRequest request =
                new LlmRequest(
                        provider.getProviderType(),
                        model,
                        template.getPurpose(),
                        messages,
                        provider.getTemperature() != null ? provider.getTemperature().doubleValue() : 0.4,
                        provider.getMaxTokens(),
                        metadata);

        LlmResponse response = llmGatewayRouter.route(request);
        long latency = System.currentTimeMillis() - start;

        String outText = response.text() != null ? response.text() : "";
        if (outText.isBlank() && response.json() != null) {
            outText = response.json();
        }
        String redactedOut = safetyService.redactSecrets(workspaceId, outText);

        AppUser user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        String tokenJson;
        try {
            tokenJson = objectMapper.writeValueAsString(response.tokenUsage() != null ? response.tokenUsage() : Map.of());
        } catch (Exception e) {
            tokenJson = "{}";
        }

        String outputJsonValue = null;
        if (template.getOutputFormat() == OutputFormat.JSON) {
            try {
                outputJsonValue = objectMapper.writeValueAsString(objectMapper.readTree(redactedOut));
            } catch (Exception e) {
                try {
                    ObjectNode wrap = objectMapper.createObjectNode();
                    wrap.put("text", redactedOut);
                    outputJsonValue = objectMapper.writeValueAsString(wrap);
                } catch (Exception ex) {
                    outputJsonValue = "{}";
                }
            }
        }

        AiPromptRun run =
                AiPromptRun.builder()
                        .workspace(workspace)
                        .promptTemplate(template)
                        .providerConfig(provider)
                        .model(model)
                        .inputJson(inputJson != null && !inputJson.isBlank() ? inputJson : "{}")
                        .outputText(redactedOut)
                        .outputJson(outputJsonValue)
                        .tokenUsageJson(tokenJson)
                        .latencyMs((int) Math.min(latency, Integer.MAX_VALUE))
                        .status("SUCCESS")
                        .createdByUser(user)
                        .build();

        AiPromptRun saved = promptRunRepository.save(run);
        auditService.log(
                workspace.getOrg().getId(),
                workspaceId,
                userId,
                "AI_PROMPT_RUN",
                "AiPromptRun",
                saved.getId(),
                null,
                summarizeRun(saved));
        return saved;
    }

    private AiPromptTemplate setStatusAndAudit(UUID promptId, PromptStatus status, String action) {
        UUID userId = SecurityUtils.currentUserId();
        AiPromptTemplate t =
                promptTemplateRepository
                        .findById(promptId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiPromptTemplate", "id", promptId));
        String before = summarizeTemplate(t);
        AppUser user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));
        t.setUpdatedByUser(user);
        t.setStatus(status);
        AiPromptTemplate saved = promptTemplateRepository.save(t);
        auditService.log(
                saved.getOrg().getId(),
                saved.getWorkspace() != null ? saved.getWorkspace().getId() : null,
                userId,
                action,
                "AiPromptTemplate",
                saved.getId(),
                before,
                summarizeTemplate(saved));
        return saved;
    }

    private static <T> void applyIfPresent(
            Map<String, Object> updates, String key, Class<T> type, java.util.function.Consumer<T> setter) {
        if (!updates.containsKey(key)) {
            return;
        }
        Object v = updates.get(key);
        if (v == null) {
            return;
        }
        if (type.isInstance(v)) {
            setter.accept(type.cast(v));
        } else {
            setter.accept(type.cast(String.valueOf(v)));
        }
    }

    private JsonNode parseInputJson(String inputJson) {
        if (inputJson == null || inputJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(inputJson);
        } catch (Exception e) {
            log.warn("Invalid input JSON for prompt run; using empty object: {}", e.getMessage());
            return objectMapper.createObjectNode();
        }
    }

    private String expandTemplate(String template, JsonNode vars) {
        if (template == null) {
            return "";
        }
        if (vars == null || vars.isNull()) {
            return template;
        }
        String out = template;
        Iterator<String> names = vars.fieldNames();
        while (names.hasNext()) {
            String key = names.next();
            JsonNode node = vars.get(key);
            String placeholder = "{{" + key + "}}";
            String value;
            if (node == null || node.isNull()) {
                value = "";
            } else if (node.isTextual()) {
                value = node.asText();
            } else {
                value = node.toString();
            }
            out = out.replace(placeholder, value);
        }
        return out;
    }

    private String summarizeTemplate(AiPromptTemplate t) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", t.getId().toString());
            n.put("name", t.getName());
            n.put("status", t.getStatus() != null ? t.getStatus().name() : null);
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String summarizeRun(AiPromptRun r) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", r.getId().toString());
            n.put("status", r.getStatus());
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }
}
