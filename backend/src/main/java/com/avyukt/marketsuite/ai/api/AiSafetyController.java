package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiRedactionRuleCreateRequest;
import com.avyukt.marketsuite.ai.api.dto.AiRedactionRulePatchRequest;
import com.avyukt.marketsuite.ai.api.dto.AiRedactionRuleResponse;
import com.avyukt.marketsuite.ai.api.dto.AiSafetyPolicyPatchRequest;
import com.avyukt.marketsuite.ai.api.dto.AiSafetyPolicyResponse;
import com.avyukt.marketsuite.ai.domain.AiRedactionRule;
import com.avyukt.marketsuite.ai.domain.AiSafetyPolicy;
import com.avyukt.marketsuite.ai.repo.AiRedactionRuleRepository;
import com.avyukt.marketsuite.ai.repo.AiSafetyPolicyRepository;
import com.avyukt.marketsuite.ai.service.safety.AiSafetyService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/ai/safety")
@Tag(name = "AI Safety")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiSafetyController {

    private final AiSafetyPolicyRepository safetyPolicyRepository;
    private final AiRedactionRuleRepository redactionRuleRepository;
    private final AiSafetyService safetyService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final WorkspaceRepository workspaceRepository;
    private final ObjectMapper objectMapper;

    public AiSafetyController(
            AiSafetyPolicyRepository safetyPolicyRepository,
            AiRedactionRuleRepository redactionRuleRepository,
            AiSafetyService safetyService,
            PermissionService permissionService,
            AuditService auditService,
            WorkspaceRepository workspaceRepository,
            ObjectMapper objectMapper) {
        this.safetyPolicyRepository = safetyPolicyRepository;
        this.redactionRuleRepository = redactionRuleRepository;
        this.safetyService = safetyService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.workspaceRepository = workspaceRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/policy")
    @Operation(summary = "Get AI safety policy for workspace")
    public ResponseEntity<AiSafetyPolicyResponse> getPolicy(@PathVariable UUID workspaceId) {
        var ws = loadWorkspace(workspaceId);
        permissionService.requireAiWorkspaceManagement(ws.getOrg().getId(), workspaceId);
        AiSafetyPolicy policy =
                safetyPolicyRepository
                        .findByWorkspaceId(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiSafetyPolicy", "workspaceId", workspaceId));
        return ResponseEntity.ok(toSafetyPolicyResponse(policy));
    }

    @PatchMapping("/policy")
    @Transactional
    @Operation(summary = "Update AI safety policy for workspace")
    public ResponseEntity<AiSafetyPolicyResponse> patchPolicy(
            @PathVariable UUID workspaceId, @Valid @RequestBody AiSafetyPolicyPatchRequest request) {
        var ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);
        UUID actorId = SecurityUtils.currentUserId();

        AiSafetyPolicy policy =
                safetyPolicyRepository
                        .findByWorkspaceId(workspaceId)
                        .orElseGet(
                                () ->
                                        AiSafetyPolicy.builder()
                                                .workspace(ws)
                                                .policyJson("{}")
                                                .build());
        String before = summarizePolicy(policy);
        policy.setPolicyJson(request.policyJson());
        AiSafetyPolicy saved = safetyPolicyRepository.save(policy);
        auditService.log(
                orgId,
                workspaceId,
                actorId,
                "AI_SAFETY_POLICY_PATCH",
                "AiSafetyPolicy",
                saved.getId(),
                before,
                summarizePolicy(saved));
        safetyService.clearRedactionCache(workspaceId);
        return ResponseEntity.ok(toSafetyPolicyResponse(saved));
    }

    @GetMapping("/redaction-rules")
    @Operation(summary = "List AI redaction rules for workspace")
    public ResponseEntity<List<AiRedactionRuleResponse>> listRedactionRules(@PathVariable UUID workspaceId) {
        var ws = loadWorkspace(workspaceId);
        permissionService.requireAiWorkspaceManagement(ws.getOrg().getId(), workspaceId);
        List<AiRedactionRuleResponse> out =
                redactionRuleRepository.findByWorkspaceId(workspaceId).stream()
                        .map(this::toRedactionRuleResponse)
                        .toList();
        return ResponseEntity.ok(out);
    }

    @PostMapping("/redaction-rules")
    @Transactional
    @Operation(summary = "Create AI redaction rule")
    public ResponseEntity<AiRedactionRuleResponse> createRedactionRule(
            @PathVariable UUID workspaceId, @Valid @RequestBody AiRedactionRuleCreateRequest request) {
        var ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);
        UUID actorId = SecurityUtils.currentUserId();

        AiRedactionRule rule =
                AiRedactionRule.builder()
                        .workspace(ws)
                        .name(request.name())
                        .pattern(request.pattern())
                        .replacement(
                                request.replacement() != null && !request.replacement().isBlank()
                                        ? request.replacement()
                                        : "[REDACTED]")
                        .enabled(request.enabled() == null || request.enabled())
                        .build();
        AiRedactionRule saved = redactionRuleRepository.save(rule);
        auditService.log(
                orgId,
                workspaceId,
                actorId,
                "AI_REDACTION_RULE_CREATE",
                "AiRedactionRule",
                saved.getId(),
                null,
                summarizeRule(saved));
        safetyService.clearRedactionCache(workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(toRedactionRuleResponse(saved));
    }

    @PatchMapping("/redaction-rules/{ruleId}")
    @Transactional
    @Operation(summary = "Update AI redaction rule")
    public ResponseEntity<AiRedactionRuleResponse> patchRedactionRule(
            @PathVariable UUID workspaceId,
            @PathVariable UUID ruleId,
            @Valid @RequestBody AiRedactionRulePatchRequest request) {
        var ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);
        UUID actorId = SecurityUtils.currentUserId();

        AiRedactionRule rule = loadRule(workspaceId, ruleId);
        String before = summarizeRule(rule);
        if (request.name() != null) {
            rule.setName(request.name());
        }
        if (request.pattern() != null) {
            rule.setPattern(request.pattern());
        }
        if (request.replacement() != null) {
            rule.setReplacement(request.replacement());
        }
        if (request.enabled() != null) {
            rule.setEnabled(request.enabled());
        }
        AiRedactionRule saved = redactionRuleRepository.save(rule);
        auditService.log(
                orgId,
                workspaceId,
                actorId,
                "AI_REDACTION_RULE_PATCH",
                "AiRedactionRule",
                saved.getId(),
                before,
                summarizeRule(saved));
        safetyService.clearRedactionCache(workspaceId);
        return ResponseEntity.ok(toRedactionRuleResponse(saved));
    }

    @DeleteMapping("/redaction-rules/{ruleId}")
    @Transactional
    @Operation(summary = "Delete AI redaction rule")
    public ResponseEntity<Void> deleteRedactionRule(
            @PathVariable UUID workspaceId, @PathVariable UUID ruleId) {
        var ws = loadWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireAiWorkspaceManagement(orgId, workspaceId);
        UUID actorId = SecurityUtils.currentUserId();

        AiRedactionRule rule = loadRule(workspaceId, ruleId);
        String before = summarizeRule(rule);
        redactionRuleRepository.delete(rule);
        auditService.log(
                orgId,
                workspaceId,
                actorId,
                "AI_REDACTION_RULE_DELETE",
                "AiRedactionRule",
                ruleId,
                before,
                null);
        safetyService.clearRedactionCache(workspaceId);
        return ResponseEntity.noContent().build();
    }

    private Workspace loadWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private AiRedactionRule loadRule(UUID workspaceId, UUID ruleId) {
        AiRedactionRule rule =
                redactionRuleRepository
                        .findById(ruleId)
                        .orElseThrow(() -> new ResourceNotFoundException("AiRedactionRule", "id", ruleId));
        if (!rule.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Redaction rule does not belong to this workspace");
        }
        return rule;
    }

    private AiSafetyPolicyResponse toSafetyPolicyResponse(AiSafetyPolicy p) {
        return new AiSafetyPolicyResponse(
                p.getId(), p.getWorkspace().getId(), p.getPolicyJson(), p.getCreatedAt(), p.getUpdatedAt());
    }

    private AiRedactionRuleResponse toRedactionRuleResponse(AiRedactionRule r) {
        return new AiRedactionRuleResponse(
                r.getId(),
                r.getWorkspace().getId(),
                r.getName(),
                r.getPattern(),
                r.getReplacement(),
                r.isEnabled(),
                r.getCreatedAt(),
                r.getUpdatedAt());
    }

    private String summarizePolicy(AiSafetyPolicy p) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", p.getId().toString());
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }

    private String summarizeRule(AiRedactionRule r) {
        try {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("id", r.getId().toString());
            n.put("name", r.getName());
            return objectMapper.writeValueAsString(n);
        } catch (Exception e) {
            return "{}";
        }
    }
}
