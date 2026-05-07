package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetPatchRequest;
import com.avyukt.marketsuite.governance.api.dto.BrandRuleSetResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.*;
import com.avyukt.marketsuite.governance.repo.BrandRuleRepository;
import com.avyukt.marketsuite.governance.repo.BrandRuleSetRepository;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BrandRuleSetService {

    private final BrandRuleSetRepository repository;
    private final BrandRuleRepository ruleRepository;
    private final OrganizationRepository orgRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public BrandRuleSetService(
            BrandRuleSetRepository repository,
            BrandRuleRepository ruleRepository,
            OrganizationRepository orgRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.ruleRepository = ruleRepository;
        this.orgRepository = orgRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<BrandRuleSetResponse> list(UUID orgId, UUID workspaceId, BrandStatus status) {
        permissionService.requireOrgAccess(orgId);
        return repository.findFiltered(orgId, workspaceId, status).stream()
                .map(mapper::toRuleSetResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BrandRuleSetResponse get(UUID ruleSetId) {
        BrandRuleSet rs = repository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(rs.getOrg().getId());
        return mapper.toRuleSetResponse(rs);
    }

    public BrandRuleSetResponse create(UUID orgId, BrandRuleSetCreateRequest req) {
        BrandProfileScope scope = BrandProfileScope.valueOf(req.scope());
        UUID workspaceId = req.workspaceId() != null ? UUID.fromString(req.workspaceId()) : null;
        if (scope == BrandProfileScope.ORG) {
            permissionService.requireBrandOrgManagement(orgId);
        } else {
            if (workspaceId == null) throw new BusinessException("workspaceId required for WORKSPACE scope");
            permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        }
        BrandRuleSet ruleSet = BrandRuleSet.builder()
                .scope(scope)
                .org(orgRepository.getReferenceById(orgId))
                .workspace(workspaceId != null ? workspaceRepository.getReferenceById(workspaceId) : null)
                .name(req.name())
                .domain(req.domain() != null ? ComplianceDomain.valueOf(req.domain()) : ComplianceDomain.GENERAL)
                .description(req.description())
                .build();
        BrandRuleSet saved = repository.save(ruleSet);
        auditService.log(orgId, workspaceId, SecurityUtils.currentUserId(), "CREATE", "BRAND_RULE_SET", saved.getId(), null, toJson(saved));
        return mapper.toRuleSetResponse(saved);
    }

    public BrandRuleSetResponse patch(UUID orgId, UUID ruleSetId, BrandRuleSetPatchRequest req) {
        BrandRuleSet rs = repository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(orgId);
        String before = toJson(rs);
        if (req.name() != null) rs.setName(req.name());
        if (req.domain() != null) rs.setDomain(ComplianceDomain.valueOf(req.domain()));
        if (req.description() != null) rs.setDescription(req.description());
        BrandRuleSet saved = repository.save(rs);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE", "BRAND_RULE_SET", saved.getId(), before, toJson(saved));
        return mapper.toRuleSetResponse(saved);
    }

    public BrandRuleSetResponse archive(UUID orgId, UUID ruleSetId) {
        BrandRuleSet rs = repository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        permissionService.requireOrgAccess(orgId);
        rs.setStatus(BrandStatus.ARCHIVED);
        BrandRuleSet saved = repository.save(rs);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "ARCHIVE", "BRAND_RULE_SET", saved.getId(), null, toJson(saved));
        return mapper.toRuleSetResponse(saved);
    }

    public BrandRuleSetResponse cloneToWorkspace(UUID orgId, UUID ruleSetId, UUID workspaceId) {
        permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        BrandRuleSet source = repository.findById(ruleSetId)
                .orElseThrow(() -> new ResourceNotFoundException("BrandRuleSet", "id", ruleSetId));
        BrandRuleSet clone = BrandRuleSet.builder()
                .scope(BrandProfileScope.WORKSPACE)
                .org(orgRepository.getReferenceById(orgId))
                .workspace(workspaceRepository.getReferenceById(workspaceId))
                .name(source.getName())
                .domain(source.getDomain())
                .description(source.getDescription())
                .build();
        BrandRuleSet savedClone = repository.save(clone);
        List<BrandRule> sourceRules = ruleRepository.findByRuleSetIdOrderByCreatedAtDesc(ruleSetId);
        for (BrandRule rule : sourceRules) {
            BrandRule clonedRule = BrandRule.builder()
                    .ruleSet(savedClone)
                    .ruleType(rule.getRuleType())
                    .severity(rule.getSeverity())
                    .name(rule.getName())
                    .description(rule.getDescription())
                    .pattern(rule.getPattern())
                    .parametersJson(rule.getParametersJson())
                    .appliesToJson(rule.getAppliesToJson())
                    .build();
            ruleRepository.save(clonedRule);
        }
        auditService.log(orgId, workspaceId, SecurityUtils.currentUserId(), "CLONE", "BRAND_RULE_SET", savedClone.getId(), null, toJson(savedClone));
        return mapper.toRuleSetResponse(savedClone);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
