package com.avyukt.marketsuite.creative.service;

import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactCreateRequest;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactResponse;
import com.avyukt.marketsuite.creative.api.dto.CopyArtifactUpdateRequest;
import com.avyukt.marketsuite.creative.api.mapper.CreativeMapper;
import com.avyukt.marketsuite.creative.domain.CopyArtifactType;
import com.avyukt.marketsuite.creative.domain.CopyStatus;
import com.avyukt.marketsuite.creative.domain.CreativeCopyArtifact;
import com.avyukt.marketsuite.creative.domain.CreativeFormat;
import com.avyukt.marketsuite.creative.repo.CreativeCopyArtifactRepository;
import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRunResponse;
import com.avyukt.marketsuite.governance.service.GovernanceCheckService;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CreativeCopyService {

    private static final Logger log = LoggerFactory.getLogger(CreativeCopyService.class);

    private final CreativeCopyArtifactRepository copyRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final CreativeMapper creativeMapper;
    private final ObjectMapper objectMapper;
    private final GovernanceCheckService governanceCheckService;

    public CreativeCopyService(
            CreativeCopyArtifactRepository copyRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            CreativeMapper creativeMapper,
            ObjectMapper objectMapper,
            GovernanceCheckService governanceCheckService) {
        this.copyRepository = copyRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.creativeMapper = creativeMapper;
        this.objectMapper = objectMapper;
        this.governanceCheckService = governanceCheckService;
    }

    public CopyArtifactResponse create(UUID workspaceId, CopyArtifactCreateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CopyArtifactType type = parseCopyType(request.type());
        CreativeFormat format = parseFormatOrNull(request.format());

        CreativeCopyArtifact entity = CreativeCopyArtifact.builder()
                .workspace(ws)
                .org(ws.getOrg())
                .type(type)
                .status(CopyStatus.DRAFT)
                .name(request.name())
                .language(request.language() != null && !request.language().isBlank() ? request.language() : "en")
                .format(format)
                .contentText(request.contentText())
                .contentJson(request.contentJson() != null ? request.contentJson() : "{}")
                .templateId(request.templateId())
                .ruleSetId(request.ruleSetId())
                .disclaimerIds(request.disclaimerIds() != null ? request.disclaimerIds() : "[]")
                .createdByUser(user)
                .updatedByUser(user)
                .build();

        CreativeCopyArtifact saved = copyRepository.save(entity);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "CREATE_COPY_ARTIFACT",
                "CreativeCopyArtifact",
                saved.getId(),
                null,
                toJson(saved));
        return creativeMapper.toCopyResponse(saved);
    }

    public CopyArtifactResponse update(UUID workspaceId, UUID copyId, CopyArtifactUpdateRequest request) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeCopyArtifact artifact = copyRepository
                .findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeCopyArtifact", "id", copyId));
        assertWorkspaceMatch(artifact, workspaceId);
        if (artifact.getStatus() != CopyStatus.DRAFT) {
            throw new BusinessException("Only draft copy artifacts can be updated");
        }
        String before = toJson(artifact);

        if (request.name() != null) {
            artifact.setName(request.name());
        }
        if (request.contentText() != null) {
            artifact.setContentText(request.contentText());
        }
        if (request.contentJson() != null) {
            artifact.setContentJson(request.contentJson());
        }
        if (request.language() != null) {
            artifact.setLanguage(request.language());
        }
        if (request.format() != null && !request.format().isBlank()) {
            artifact.setFormat(parseFormat(request.format()));
        }
        if (request.templateId() != null) {
            artifact.setTemplateId(request.templateId());
        }
        if (request.ruleSetId() != null) {
            artifact.setRuleSetId(request.ruleSetId());
        }
        if (request.disclaimerIds() != null) {
            artifact.setDisclaimerIds(request.disclaimerIds());
        }
        artifact.setUpdatedByUser(user);

        CreativeCopyArtifact saved = copyRepository.save(artifact);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "UPDATE_COPY_ARTIFACT",
                "CreativeCopyArtifact",
                saved.getId(),
                before,
                toJson(saved));
        return creativeMapper.toCopyResponse(saved);
    }

    public CopyArtifactResponse archive(UUID workspaceId, UUID copyId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeCopyArtifact artifact = copyRepository
                .findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeCopyArtifact", "id", copyId));
        assertWorkspaceMatch(artifact, workspaceId);
        String before = toJson(artifact);
        artifact.setStatus(CopyStatus.ARCHIVED);
        artifact.setUpdatedByUser(user);
        CreativeCopyArtifact saved = copyRepository.save(artifact);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "ARCHIVE_COPY_ARTIFACT",
                "CreativeCopyArtifact",
                saved.getId(),
                before,
                toJson(saved));
        return creativeMapper.toCopyResponse(saved);
    }

    @Transactional(readOnly = true)
    public CopyArtifactResponse get(UUID workspaceId, UUID copyId) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);
        CreativeCopyArtifact artifact = copyRepository
                .findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeCopyArtifact", "id", copyId));
        assertWorkspaceMatch(artifact, workspaceId);
        return creativeMapper.toCopyResponse(artifact);
    }

    @Transactional(readOnly = true)
    public PagedResponse<CopyArtifactResponse> list(
            UUID workspaceId,
            String type,
            String status,
            String language,
            String query,
            Pageable pageable) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeRead(orgId, workspaceId);

        CopyArtifactType copyType = parseCopyTypeOrNull(type);
        CopyStatus copyStatus = parseCopyStatusOrNull(status);
        Specification<CreativeCopyArtifact> spec = copySpec(workspaceId, copyType, copyStatus, language, query);
        Page<CreativeCopyArtifact> page = copyRepository.findAll(spec, pageable);
        return PagedResponse.from(page.map(creativeMapper::toCopyResponse));
    }

    public CopyArtifactResponse runGovernanceCheck(
            UUID workspaceId, UUID copyId, String platformType, String language) {
        Workspace ws = requireWorkspace(workspaceId);
        UUID orgId = ws.getOrg().getId();
        permissionService.requireCreativeManagement(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);

        CreativeCopyArtifact artifact = copyRepository
                .findById(copyId)
                .orElseThrow(() -> new ResourceNotFoundException("CreativeCopyArtifact", "id", copyId));
        assertWorkspaceMatch(artifact, workspaceId);
        String before = toJson(artifact);

        String contentPayloadJson = buildContentPayloadJson(artifact);
        PlatformType platform = parsePlatformTypeOrNull(platformType);

        GovernanceCheckRunResponse runResponse =
                governanceCheckService.runChecks(
                        workspaceId,
                        "COPY_ARTIFACT",
                        copyId,
                        contentPayloadJson,
                        artifact.getRuleSetId(),
                        platform,
                        language);

        artifact.setGovernanceCheckRunId(runResponse.id());
        artifact.setUpdatedByUser(user);
        CreativeCopyArtifact saved = copyRepository.save(artifact);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RUN_COPY_GOVERNANCE_CHECK",
                "CreativeCopyArtifact",
                saved.getId(),
                before,
                toJson(saved));
        return creativeMapper.toCopyResponse(saved);
    }

    private String buildContentPayloadJson(CreativeCopyArtifact artifact) {
        try {
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("contentText", artifact.getContentText());
            try {
                payload.set("contentJson", objectMapper.readTree(artifact.getContentJson()));
            } catch (Exception e) {
                payload.put("contentJson", artifact.getContentJson());
            }
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            log.warn("Failed to build governance content payload", e);
            return "{}";
        }
    }

    private PlatformType parsePlatformTypeOrNull(String platformType) {
        if (platformType == null || platformType.isBlank()) {
            return null;
        }
        try {
            return PlatformType.valueOf(platformType.trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Workspace requireWorkspace(UUID workspaceId) {
        return workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private void assertWorkspaceMatch(CreativeCopyArtifact artifact, UUID workspaceId) {
        if (!artifact.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("CreativeCopyArtifact", "id", artifact.getId());
        }
    }

    private CopyArtifactType parseCopyType(String raw) {
        try {
            return CopyArtifactType.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid copy artifact type: " + raw);
        }
    }

    private CopyArtifactType parseCopyTypeOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseCopyType(raw.trim());
    }

    private CopyStatus parseCopyStatus(String raw) {
        try {
            return CopyStatus.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid copy status: " + raw);
        }
    }

    private CopyStatus parseCopyStatusOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseCopyStatus(raw.trim());
    }

    private CreativeFormat parseFormat(String raw) {
        try {
            return CreativeFormat.valueOf(raw);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid format: " + raw);
        }
    }

    private CreativeFormat parseFormatOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseFormat(raw.trim());
    }

    private Specification<CreativeCopyArtifact> copySpec(
            UUID workspaceId,
            CopyArtifactType type,
            CopyStatus status,
            String language,
            String query) {
        return (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("workspace").get("id"), workspaceId));
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (language != null && !language.isBlank()) {
                predicates.add(cb.equal(root.get("language"), language.trim()));
            }
            if (query != null && !query.isBlank()) {
                predicates.add(
                        cb.like(cb.lower(root.get("name")), "%" + query.toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize entity for audit", e);
            return null;
        }
    }
}
