package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.OrgBrandProfilePatchRequest;
import com.avyukt.marketsuite.governance.api.dto.OrgBrandProfileResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.BrandStatus;
import com.avyukt.marketsuite.governance.domain.OrgBrandProfile;
import com.avyukt.marketsuite.governance.domain.ToneStyle;
import com.avyukt.marketsuite.governance.repo.OrgBrandProfileRepository;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrgBrandProfileService {

    private final OrgBrandProfileRepository repository;
    private final OrganizationRepository orgRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public OrgBrandProfileService(
            OrgBrandProfileRepository repository,
            OrganizationRepository orgRepository,
            PermissionService permissionService,
            AuditService auditService,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.orgRepository = orgRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public OrgBrandProfileResponse get(UUID orgId) {
        permissionService.requireOrgAccess(orgId);
        OrgBrandProfile profile = repository
                .findByOrgId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("OrgBrandProfile", "orgId", orgId));
        return mapper.toOrgProfileResponse(profile);
    }

    public OrgBrandProfileResponse createDefault(UUID orgId) {
        permissionService.requireBrandOrgManagement(orgId);
        if (repository.existsByOrgId(orgId)) {
            throw new BusinessException("Org brand profile already exists");
        }
        Organization org =
                orgRepository.findById(orgId).orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));
        OrgBrandProfile profile =
                OrgBrandProfile.builder().org(org).displayName(org.getName() + " Brand").build();
        OrgBrandProfile saved = repository.save(profile);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "CREATE", "ORG_BRAND_PROFILE", saved.getId(), null, toJson(saved));
        return mapper.toOrgProfileResponse(saved);
    }

    public OrgBrandProfileResponse patch(UUID orgId, OrgBrandProfilePatchRequest req) {
        permissionService.requireBrandOrgManagement(orgId);
        OrgBrandProfile profile = repository
                .findByOrgId(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("OrgBrandProfile", "orgId", orgId));
        String before = toJson(profile);
        if (req.displayName() != null) profile.setDisplayName(req.displayName());
        if (req.status() != null) profile.setStatus(BrandStatus.valueOf(req.status()));
        if (req.primaryColor() != null) profile.setPrimaryColor(req.primaryColor());
        if (req.secondaryColor() != null) profile.setSecondaryColor(req.secondaryColor());
        if (req.accentColor() != null) profile.setAccentColor(req.accentColor());
        if (req.fontPrimary() != null) profile.setFontPrimary(req.fontPrimary());
        if (req.fontSecondary() != null) profile.setFontSecondary(req.fontSecondary());
        if (req.logoAssetId() != null) profile.setLogoAssetId(UUID.fromString(req.logoAssetId()));
        if (req.voiceTone() != null) profile.setVoiceTone(ToneStyle.valueOf(req.voiceTone()));
        if (req.voiceGuidelinesText() != null) profile.setVoiceGuidelinesText(req.voiceGuidelinesText());
        if (req.doListText() != null) profile.setDoListText(req.doListText());
        if (req.dontListText() != null) profile.setDontListText(req.dontListText());
        if (req.defaultLanguage() != null) profile.setDefaultLanguage(req.defaultLanguage());
        if (req.supportedLanguages() != null) profile.setSupportedLanguages(req.supportedLanguages());
        OrgBrandProfile saved = repository.save(profile);
        auditService.log(orgId, null, SecurityUtils.currentUserId(), "UPDATE", "ORG_BRAND_PROFILE", saved.getId(), before, toJson(saved));
        return mapper.toOrgProfileResponse(saved);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
