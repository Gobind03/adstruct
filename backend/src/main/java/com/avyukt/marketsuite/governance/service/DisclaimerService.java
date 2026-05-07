package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.*;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.*;
import com.avyukt.marketsuite.governance.repo.DisclaimerLocalizationRepository;
import com.avyukt.marketsuite.governance.repo.DisclaimerRepository;
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
public class DisclaimerService {

    private final DisclaimerRepository repository;
    private final DisclaimerLocalizationRepository localizationRepository;
    private final OrganizationRepository orgRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public DisclaimerService(
            DisclaimerRepository repository,
            DisclaimerLocalizationRepository localizationRepository,
            OrganizationRepository orgRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.localizationRepository = localizationRepository;
        this.orgRepository = orgRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<DisclaimerResponse> list(UUID orgId, UUID workspaceId, BrandStatus status) {
        permissionService.requireOrgAccess(orgId);
        return repository.findFiltered(orgId, workspaceId, status).stream()
                .map(mapper::toDisclaimerResponse)
                .toList();
    }

    public DisclaimerResponse create(UUID orgId, DisclaimerCreateRequest req) {
        BrandProfileScope scope = BrandProfileScope.valueOf(req.scope());
        UUID workspaceId = req.workspaceId() != null ? UUID.fromString(req.workspaceId()) : null;
        if (scope == BrandProfileScope.WORKSPACE && workspaceId == null) {
            throw new BusinessException("workspaceId required for WORKSPACE scope");
        }
        if (scope == BrandProfileScope.ORG) {
            permissionService.requireBrandOrgManagement(orgId);
        } else {
            permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        }
        Disclaimer disclaimer = Disclaimer.builder()
                .scope(scope)
                .org(orgRepository.getReferenceById(orgId))
                .workspace(workspaceId != null ? workspaceRepository.getReferenceById(workspaceId) : null)
                .key(req.key())
                .title(req.title())
                .defaultText(req.defaultText())
                .build();
        Disclaimer saved = repository.save(disclaimer);
        auditService.log(orgId, workspaceId, SecurityUtils.currentUserId(), "CREATE", "DISCLAIMER", saved.getId(), null, toJson(saved));
        return mapper.toDisclaimerResponse(saved);
    }

    public DisclaimerResponse patch(UUID orgId, UUID disclaimerId, DisclaimerPatchRequest req) {
        Disclaimer disclaimer = repository.findById(disclaimerId)
                .orElseThrow(() -> new ResourceNotFoundException("Disclaimer", "id", disclaimerId));
        permissionService.requireOrgAccess(orgId);
        String before = toJson(disclaimer);
        if (req.title() != null) disclaimer.setTitle(req.title());
        if (req.defaultText() != null) disclaimer.setDefaultText(req.defaultText());
        if (req.status() != null) disclaimer.setStatus(BrandStatus.valueOf(req.status()));
        Disclaimer saved = repository.save(disclaimer);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE", "DISCLAIMER", saved.getId(), before, toJson(saved));
        return mapper.toDisclaimerResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DisclaimerLocalizationResponse> listLocalizations(UUID disclaimerId) {
        return localizationRepository.findByDisclaimerIdOrderByLanguage(disclaimerId).stream()
                .map(mapper::toLocalizationResponse)
                .toList();
    }

    public DisclaimerLocalizationResponse createLocalization(UUID orgId, UUID disclaimerId, DisclaimerLocalizationRequest req) {
        Disclaimer disclaimer = repository.findById(disclaimerId)
                .orElseThrow(() -> new ResourceNotFoundException("Disclaimer", "id", disclaimerId));
        permissionService.requireOrgAccess(orgId);
        DisclaimerLocalization loc = DisclaimerLocalization.builder()
                .disclaimer(disclaimer)
                .language(req.language())
                .text(req.text())
                .build();
        DisclaimerLocalization saved = localizationRepository.save(loc);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "CREATE", "DISCLAIMER_LOCALIZATION", saved.getId(), null, toJson(saved));
        return mapper.toLocalizationResponse(saved);
    }

    public DisclaimerLocalizationResponse patchLocalization(UUID orgId, UUID locId, DisclaimerLocalizationRequest req) {
        DisclaimerLocalization loc = localizationRepository.findById(locId)
                .orElseThrow(() -> new ResourceNotFoundException("DisclaimerLocalization", "id", locId));
        permissionService.requireOrgAccess(orgId);
        String before = toJson(loc);
        if (req.language() != null) loc.setLanguage(req.language());
        if (req.text() != null) loc.setText(req.text());
        DisclaimerLocalization saved = localizationRepository.save(loc);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE", "DISCLAIMER_LOCALIZATION", saved.getId(), before, toJson(saved));
        return mapper.toLocalizationResponse(saved);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
