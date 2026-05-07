package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRulePatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.BrandRule;
import com.avyukt.marketsuite.governance.domain.BrandRuleSet;
import com.avyukt.marketsuite.governance.domain.RuleSeverity;
import com.avyukt.marketsuite.governance.domain.RuleType;
import com.avyukt.marketsuite.governance.repo.BrandRuleRepository;
import com.avyukt.marketsuite.governance.repo.BrandRuleSetRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BrandRuleService {

    private static final int MAX_PATTERN_LENGTH = 500;

    private final BrandRuleRepository repository;
    private final BrandRuleSetRepository ruleSetRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public BrandRuleService(
            BrandRuleRepository repository,
            BrandRuleSetRepository ruleSetRepository,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.ruleSetRepository = ruleSetRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<BrandRuleResponse> listByRuleSet(UUID ruleSetId) {
        BrandRuleSet rs = ruleSetRepository
                .findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(rs.getOrg().getId());
        return repository.findByRuleSetIdOrderByCreatedAtDesc(ruleSetId).stream()
                .map(mapper::toRuleResponse)
                .toList();
    }

    public BrandRuleResponse create(UUID ruleSetId, BrandRuleCreateRequest req) {
        BrandRuleSet rs = ruleSetRepository
                .findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(rs.getOrg().getId());
        validatePattern(req.pattern());
        BrandRule rule = BrandRule.builder()
                .ruleSet(rs)
                .ruleType(RuleType.valueOf(req.ruleType()))
                .severity(RuleSeverity.valueOf(req.severity()))
                .name(req.name())
                .description(req.description())
                .pattern(req.pattern())
                .parametersJson(req.parametersJson() != null ? req.parametersJson() : "{}")
                .appliesToJson(req.appliesToJson() != null ? req.appliesToJson() : "{}")
                .build();
        BrandRule saved = repository.save(rule);
        auditService.log(
                rs.getOrg().getId(), null, SecurityUtils.currentUserId(), "CREATE", "BRAND_RULE", saved.getId(), null, toJson(saved));
        return mapper.toRuleResponse(saved);
    }

    public BrandRuleResponse patch(UUID ruleSetId, UUID ruleId, BrandRulePatchRequest req) {
        BrandRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRule", "id", ruleId));
        BrandRuleSet rs = ruleSetRepository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(rs.getOrg().getId());
        String before = toJson(rule);
        if (req.ruleType() != null) rule.setRuleType(RuleType.valueOf(req.ruleType()));
        if (req.severity() != null) rule.setSeverity(RuleSeverity.valueOf(req.severity()));
        if (req.name() != null) rule.setName(req.name());
        if (req.description() != null) rule.setDescription(req.description());
        if (req.pattern() != null) {
            validatePattern(req.pattern());
            rule.setPattern(req.pattern());
        }
        if (req.parametersJson() != null) rule.setParametersJson(req.parametersJson());
        if (req.appliesToJson() != null) rule.setAppliesToJson(req.appliesToJson());
        BrandRule saved = repository.save(rule);
        auditService.log(
                rs.getOrg().getId(), null, SecurityUtils.currentUserId(), "UPDATE", "BRAND_RULE", saved.getId(), before, toJson(saved));
        return mapper.toRuleResponse(saved);
    }

    public void delete(UUID ruleSetId, UUID ruleId) {
        BrandRuleSet rs = ruleSetRepository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(rs.getOrg().getId());
        BrandRule rule = repository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRule", "id", ruleId));
        auditService.log(
                rs.getOrg().getId(), null, SecurityUtils.currentUserId(), "DELETE", "BRAND_RULE", ruleId, toJson(rule), null);
        repository.deleteById(ruleId);
    }

    private void validatePattern(String pattern) {
        if (pattern == null || pattern.isBlank()) return;
        if (pattern.length() > MAX_PATTERN_LENGTH) {
            throw new BusinessException("Pattern exceeds max length of " + MAX_PATTERN_LENGTH);
        }
        try {
            Pattern.compile(pattern);
        } catch (PatternSyntaxException e) {
            throw new BusinessException("Invalid regex pattern: " + e.getMessage());
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
