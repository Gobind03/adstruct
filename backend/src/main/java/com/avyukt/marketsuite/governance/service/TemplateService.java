package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.campaign.service.ApprovalService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.TemplateCreateRequest;
import com.avyukt.marketsuite.governance.api.dto.TemplatePatchRequest;
import com.avyukt.marketsuite.governance.api.dto.TemplateResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.*;
import com.avyukt.marketsuite.governance.repo.BrandRuleSetRepository;
import com.avyukt.marketsuite.governance.repo.TemplateRepository;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
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
public class TemplateService {

    private final TemplateRepository repository;
    private final BrandRuleSetRepository ruleSetRepository;
    private final OrganizationRepository orgRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ApprovalService approvalService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public TemplateService(
            TemplateRepository repository,
            BrandRuleSetRepository ruleSetRepository,
            OrganizationRepository orgRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            ApprovalService approvalService,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.ruleSetRepository = ruleSetRepository;
        this.orgRepository = orgRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.approvalService = approvalService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<TemplateResponse> list(UUID orgId, UUID workspaceId, TemplateType type, TemplateStatus status) {
        permissionService.requireOrgAccess(orgId);
        return repository.findFiltered(orgId, workspaceId, type, status).stream()
                .map(mapper::toTemplateResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateResponse get(UUID templateId) {
        Template t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        permissionService.requireOrgAccess(t.getOrg().getId());
        return mapper.toTemplateResponse(t);
    }

    public TemplateResponse create(UUID orgId, TemplateCreateRequest req) {
        BrandProfileScope scope = BrandProfileScope.valueOf(req.scope());
        UUID workspaceId = req.workspaceId() != null ? UUID.fromString(req.workspaceId()) : null;
        if (scope == BrandProfileScope.WORKSPACE && workspaceId == null) {
            throw new BusinessException("workspaceId required for WORKSPACE scope");
        }
        permissionService.requireOrgAccess(orgId);
        UUID userId = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(userId);
        BrandRuleSet ruleSet = req.ruleSetId() != null
                ? ruleSetRepository.getReferenceById(UUID.fromString(req.ruleSetId()))
                : null;
        Template template = Template.builder()
                .scope(scope)
                .org(orgRepository.getReferenceById(orgId))
                .workspace(workspaceId != null ? workspaceRepository.getReferenceById(workspaceId) : null)
                .templateType(TemplateType.valueOf(req.templateType()))
                .name(req.name())
                .description(req.description())
                .contentJson(req.contentJson())
                .tags(req.tags() != null ? req.tags() : "[]")
                .ruleSet(ruleSet)
                .defaultDisclaimerIds(req.defaultDisclaimerIds() != null ? req.defaultDisclaimerIds() : "[]")
                .createdByUser(user)
                .updatedByUser(user)
                .build();
        Template saved = repository.save(template);
        auditService.log(orgId, workspaceId, userId, "CREATE", "TEMPLATE", saved.getId(), null, toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    public TemplateResponse patch(UUID orgId, UUID templateId, TemplatePatchRequest req) {
        Template t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        if (t.getStatus() != TemplateStatus.DRAFT) {
            throw new BusinessException("Only DRAFT templates can be edited");
        }
        permissionService.requireOrgAccess(orgId);
        String before = toJson(t);
        UUID userId = SecurityUtils.currentUserId();
        if (req.name() != null) t.setName(req.name());
        if (req.description() != null) t.setDescription(req.description());
        if (req.contentJson() != null) t.setContentJson(req.contentJson());
        if (req.tags() != null) t.setTags(req.tags());
        if (req.ruleSetId() != null) t.setRuleSet(ruleSetRepository.getReferenceById(UUID.fromString(req.ruleSetId())));
        if (req.defaultDisclaimerIds() != null) t.setDefaultDisclaimerIds(req.defaultDisclaimerIds());
        t.setUpdatedByUser(userRepository.getReferenceById(userId));
        Template saved = repository.save(t);
        auditService.log(orgId, null, userId, "UPDATE", "TEMPLATE", saved.getId(), before, toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    public TemplateResponse submitForReview(UUID orgId, UUID templateId) {
        Template t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        if (t.getStatus() != TemplateStatus.DRAFT) {
            throw new BusinessException("Only DRAFT templates can be submitted for review");
        }
        permissionService.requireOrgAccess(orgId);
        t.setStatus(TemplateStatus.IN_REVIEW);
        Template saved = repository.save(t);
        approvalService.submit("TEMPLATE", templateId);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "SUBMIT_FOR_REVIEW", "TEMPLATE", saved.getId(), null, toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    public TemplateResponse handleApprovalResult(UUID templateId, boolean approved, String notes) {
        Template t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        if (t.getStatus() != TemplateStatus.IN_REVIEW) {
            throw new BusinessException("Only IN_REVIEW templates can be approved/rejected");
        }
        t.setStatus(approved ? TemplateStatus.APPROVED : TemplateStatus.REJECTED);
        Template saved = repository.save(t);
        auditService.log(
                t.getOrg().getId(),
                null,
                SecurityUtils.currentUserId(),
                approved ? "APPROVE" : "REJECT",
                "TEMPLATE",
                saved.getId(),
                null,
                toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    public TemplateResponse createNewVersion(UUID orgId, UUID templateId) {
        Template parent = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        if (parent.getStatus() != TemplateStatus.APPROVED) {
            throw new BusinessException("Only APPROVED templates can create new versions");
        }
        permissionService.requireOrgAccess(orgId);
        UUID userId = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(userId);
        Template newVersion = Template.builder()
                .scope(parent.getScope())
                .org(parent.getOrg())
                .workspace(parent.getWorkspace())
                .templateType(parent.getTemplateType())
                .name(parent.getName())
                .description(parent.getDescription())
                .contentJson(parent.getContentJson())
                .tags(parent.getTags())
                .version(parent.getVersion() + 1)
                .parentTemplateId(parent.getId())
                .ruleSet(parent.getRuleSet())
                .defaultDisclaimerIds(parent.getDefaultDisclaimerIds())
                .createdByUser(user)
                .updatedByUser(user)
                .build();
        Template saved = repository.save(newVersion);
        auditService.log(orgId, null, userId, "CREATE_VERSION", "TEMPLATE", saved.getId(), null, toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    public TemplateResponse archive(UUID orgId, UUID templateId) {
        Template t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template", "id", templateId));
        permissionService.requireOrgAccess(orgId);
        t.setStatus(TemplateStatus.ARCHIVED);
        Template saved = repository.save(t);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "ARCHIVE", "TEMPLATE", saved.getId(), null, toJson(saved));
        return mapper.toTemplateResponse(saved);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
