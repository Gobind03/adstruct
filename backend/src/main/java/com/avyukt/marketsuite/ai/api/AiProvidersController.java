package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiProviderConfigCreateRequest;
import com.avyukt.marketsuite.ai.api.dto.AiProviderConfigPatchRequest;
import com.avyukt.marketsuite.ai.api.dto.AiProviderConfigResponse;
import com.avyukt.marketsuite.ai.domain.AiProviderConfig;
import com.avyukt.marketsuite.ai.domain.LlmProviderType;
import com.avyukt.marketsuite.ai.repo.AiProviderConfigRepository;
import com.avyukt.marketsuite.ai.service.AiProviderSelectionService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.AuthType;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import com.avyukt.marketsuite.integration.service.IntegrationService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orgs/{orgId}/ai/providers")
@Tag(name = "AI Providers")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiProvidersController {

    private final AiProviderConfigRepository providerConfigRepository;
    @SuppressWarnings("unused")
    private final AiProviderSelectionService providerSelectionService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final IntegrationAccountRepository integrationAccountRepository;
    private final IntegrationService integrationService;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final ObjectMapper objectMapper;

    public AiProvidersController(
            AiProviderConfigRepository providerConfigRepository,
            AiProviderSelectionService providerSelectionService,
            PermissionService permissionService,
            AuditService auditService,
            IntegrationAccountRepository integrationAccountRepository,
            IntegrationService integrationService,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            ObjectMapper objectMapper) {
        this.providerConfigRepository = providerConfigRepository;
        this.providerSelectionService = providerSelectionService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.integrationAccountRepository = integrationAccountRepository;
        this.integrationService = integrationService;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List enabled AI provider configs for organization")
    public ResponseEntity<List<AiProviderConfigResponse>> list(@PathVariable UUID orgId) {
        permissionService.requireAiOrgManagement(orgId);
        List<AiProviderConfigResponse> out =
                providerConfigRepository.findByOrgIdAndEnabled(orgId, true).stream()
                        .map(this::toProviderConfigResponse)
                        .toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping
    @Transactional
    @Operation(summary = "Create AI provider config. Accepts apiKey directly to auto-create the integration account.")
    public ResponseEntity<AiProviderConfigResponse> create(
            @PathVariable UUID orgId, @Valid @RequestBody AiProviderConfigCreateRequest request) {
        permissionService.requireAiOrgManagement(orgId);
        UUID actorId = SecurityUtils.currentUserId();
        userRepository
                .findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", actorId));

        Organization org =
                organizationRepository
                        .findById(orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));

        LlmProviderType providerType;
        try {
            providerType = LlmProviderType.valueOf(request.providerType().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid providerType: " + request.providerType());
        }

        IntegrationAccount account;
        if (request.integrationAccountId() != null) {
            account = integrationAccountRepository
                    .findById(request.integrationAccountId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "IntegrationAccount", "id", request.integrationAccountId()));
            if (!account.getOrg().getId().equals(orgId)) {
                throw new BusinessException("Integration account does not belong to this organization");
            }
        } else if (request.apiKey() != null && !request.apiKey().isBlank()) {
            PlatformType platformType = switch (providerType) {
                case OPENAI -> PlatformType.OPENAI_API;
                case PERPLEXITY -> PlatformType.PERPLEXITY_API;
                case CUSTOM_HTTP -> PlatformType.CUSTOM_LLM;
                default -> PlatformType.CUSTOM_LLM;
            };
            String displayName = request.displayName() != null && !request.displayName().isBlank()
                    ? request.displayName()
                    : providerType.name() + " API Key";
            account = integrationService.create(
                    orgId,
                    platformType,
                    displayName,
                    AuthType.API_KEY,
                    java.util.Map.of("apiKey", request.apiKey()),
                    null,
                    null);
        } else {
            throw new BusinessException(
                    "Either integrationAccountId or apiKey must be provided");
        }

        BigDecimal temperature =
                request.temperature() != null
                        ? BigDecimal.valueOf(request.temperature())
                        : new BigDecimal("0.40");

        AiProviderConfig entity =
                AiProviderConfig.builder()
                        .org(org)
                        .integrationAccount(account)
                        .providerType(providerType)
                        .defaultModel(request.defaultModel())
                        .endpointBaseUrl(request.endpointBaseUrl())
                        .requestTimeoutMs(request.requestTimeoutMs() != null ? request.requestTimeoutMs() : 30000)
                        .maxTokens(request.maxTokens() != null ? request.maxTokens() : 2048)
                        .temperature(temperature)
                        .enabled(request.enabled() == null || request.enabled())
                        .build();

        AiProviderConfig saved = providerConfigRepository.save(entity);
        auditService.log(
                orgId,
                null,
                actorId,
                "AI_PROVIDER_CONFIG_CREATE",
                "AiProviderConfig",
                saved.getId(),
                null,
                summarizeProvider(saved));
        return ResponseEntity.status(HttpStatus.CREATED).body(toProviderConfigResponse(saved));
    }

    @PatchMapping("/{providerConfigId}")
    @Transactional
    @Operation(summary = "Partially update AI provider config")
    public ResponseEntity<AiProviderConfigResponse> patch(
            @PathVariable UUID orgId,
            @PathVariable UUID providerConfigId,
            @Valid @RequestBody AiProviderConfigPatchRequest request) {
        permissionService.requireAiOrgManagement(orgId);
        UUID actorId = SecurityUtils.currentUserId();
        AiProviderConfig existing = loadProviderForOrg(orgId, providerConfigId);
        String before = summarizeProvider(existing);

        if (request.defaultModel() != null) {
            existing.setDefaultModel(request.defaultModel());
        }
        if (request.endpointBaseUrl() != null) {
            existing.setEndpointBaseUrl(request.endpointBaseUrl());
        }
        if (request.requestTimeoutMs() != null) {
            existing.setRequestTimeoutMs(request.requestTimeoutMs());
        }
        if (request.maxTokens() != null) {
            existing.setMaxTokens(request.maxTokens());
        }
        if (request.temperature() != null) {
            existing.setTemperature(BigDecimal.valueOf(request.temperature()));
        }
        if (request.enabled() != null) {
            existing.setEnabled(request.enabled());
        }

        AiProviderConfig saved = providerConfigRepository.save(existing);
        auditService.log(
                orgId,
                null,
                actorId,
                "AI_PROVIDER_CONFIG_PATCH",
                "AiProviderConfig",
                saved.getId(),
                before,
                summarizeProvider(saved));
        return ResponseEntity.ok(toProviderConfigResponse(saved));
    }

    @PostMapping("/{providerConfigId}/disable")
    @Transactional
    @Operation(summary = "Disable AI provider config")
    public ResponseEntity<AiProviderConfigResponse> disable(
            @PathVariable UUID orgId, @PathVariable UUID providerConfigId) {
        permissionService.requireAiOrgManagement(orgId);
        UUID actorId = SecurityUtils.currentUserId();
        AiProviderConfig existing = loadProviderForOrg(orgId, providerConfigId);
        String before = summarizeProvider(existing);
        existing.setEnabled(false);
        AiProviderConfig saved = providerConfigRepository.save(existing);
        auditService.log(
                orgId,
                null,
                actorId,
                "AI_PROVIDER_CONFIG_DISABLE",
                "AiProviderConfig",
                saved.getId(),
                before,
                summarizeProvider(saved));
        return ResponseEntity.ok(toProviderConfigResponse(saved));
    }

    private AiProviderConfig loadProviderForOrg(UUID orgId, UUID providerConfigId) {
        AiProviderConfig cfg =
                providerConfigRepository
                        .findById(providerConfigId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException("AiProviderConfig", "id", providerConfigId));
        if (!cfg.getOrg().getId().equals(orgId)) {
            throw new BusinessException("Provider config does not belong to this organization");
        }
        return cfg;
    }

    private AiProviderConfigResponse toProviderConfigResponse(AiProviderConfig c) {
        return new AiProviderConfigResponse(
                c.getId(),
                c.getOrg().getId(),
                c.getIntegrationAccount() != null ? c.getIntegrationAccount().getId() : null,
                c.getProviderType() != null ? c.getProviderType().name() : null,
                c.getDefaultModel(),
                c.getEndpointBaseUrl(),
                c.getRequestTimeoutMs(),
                c.getMaxTokens(),
                c.getTemperature() != null ? c.getTemperature().doubleValue() : 0.0,
                c.isEnabled(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }

    private String summarizeProvider(AiProviderConfig c) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", c.getId().toString());
            n.put("enabled", c.isEnabled());
            n.put("providerType", c.getProviderType() != null ? c.getProviderType().name() : null);
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }
}
