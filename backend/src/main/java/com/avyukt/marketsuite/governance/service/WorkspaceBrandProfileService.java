package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.EffectiveBrandProfileResponse;
import com.avyukt.marketsuite.governance.domain.OrgBrandProfile;
import com.avyukt.marketsuite.governance.domain.WorkspaceBrandProfile;
import com.avyukt.marketsuite.governance.repo.OrgBrandProfileRepository;
import com.avyukt.marketsuite.governance.repo.WorkspaceBrandProfileRepository;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkspaceBrandProfileService {

    private final WorkspaceBrandProfileRepository repository;
    private final OrgBrandProfileRepository orgProfileRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public WorkspaceBrandProfileService(
            WorkspaceBrandProfileRepository repository,
            OrgBrandProfileRepository orgProfileRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.orgProfileRepository = orgProfileRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public EffectiveBrandProfileResponse initFromOrg(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        if (repository.existsByWorkspaceId(workspaceId)) {
            throw new BusinessException("Workspace brand profile already exists");
        }
        OrgBrandProfile orgProfile = orgProfileRepository
                .findByOrgId(orgId)
                .orElseThrow(() -> new BusinessException("Org brand profile must exist before workspace profile"));
        WorkspaceBrandProfile profile = WorkspaceBrandProfile.builder()
                .workspace(ws)
                .orgBrandProfile(orgProfile)
                .build();
        WorkspaceBrandProfile saved = repository.save(profile);
        auditService.log(
                orgId, workspaceId, SecurityUtils.currentUserId(), "CREATE", "WORKSPACE_BRAND_PROFILE", saved.getId(), null, toJson(saved));
        return getEffectiveProfile(workspaceId);
    }

    @Transactional(readOnly = true)
    public EffectiveBrandProfileResponse getEffectiveProfile(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireOrgAccess(ws.getOrg().getId());
        WorkspaceBrandProfile wsProfile = repository.findByWorkspaceId(workspaceId).orElse(null);
        OrgBrandProfile org;
        if (wsProfile != null) {
            org = wsProfile.getOrgBrandProfile();
        } else {
            org = orgProfileRepository
                    .findByOrgId(ws.getOrg().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("OrgBrandProfile", "orgId", ws.getOrg().getId()));
        }
        return mergeProfiles(org, wsProfile);
    }

    public EffectiveBrandProfileResponse patchOverrides(UUID workspaceId, String overridesJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireBrandWorkspaceManagement(orgId, workspaceId);
        WorkspaceBrandProfile profile = repository.findByWorkspaceId(workspaceId).orElse(null);
        if (profile == null) {
            OrgBrandProfile orgProfile = orgProfileRepository
                    .findByOrgId(orgId)
                    .orElseThrow(() -> new BusinessException("Org brand profile must exist before workspace overrides can be saved"));
            profile = WorkspaceBrandProfile.builder()
                    .workspace(ws)
                    .orgBrandProfile(orgProfile)
                    .overridesJson(overridesJson)
                    .build();
            WorkspaceBrandProfile saved = repository.save(profile);
            auditService.log(
                    orgId, workspaceId, SecurityUtils.currentUserId(), "CREATE", "WORKSPACE_BRAND_PROFILE", saved.getId(), null, toJson(saved));
            return getEffectiveProfile(workspaceId);
        }
        String before = toJson(profile);
        profile.setOverridesJson(overridesJson);
        repository.save(profile);
        auditService.log(
                orgId, workspaceId, SecurityUtils.currentUserId(), "UPDATE", "WORKSPACE_BRAND_PROFILE", profile.getId(), before, toJson(profile));
        return getEffectiveProfile(workspaceId);
    }

    private EffectiveBrandProfileResponse mergeProfiles(OrgBrandProfile org, WorkspaceBrandProfile ws) {
        String displayName = org.getDisplayName();
        String voiceTone = org.getVoiceTone().name();
        String primaryColor = org.getPrimaryColor();
        String secondaryColor = org.getSecondaryColor();
        String accentColor = org.getAccentColor();
        String fontPrimary = org.getFontPrimary();
        String fontSecondary = org.getFontSecondary();
        String defaultLanguage = org.getDefaultLanguage();
        String supportedLanguages = org.getSupportedLanguages();
        String voiceGuidelinesText = org.getVoiceGuidelinesText();
        String doListText = org.getDoListText();
        String dontListText = org.getDontListText();
        String overridesJson = ws != null ? ws.getOverridesJson() : "{}";

        if (ws != null) {
            try {
                JsonNode overrides = objectMapper.readTree(ws.getOverridesJson());
                if (overrides.has("displayName")) displayName = overrides.get("displayName").asText();
                if (overrides.has("voiceTone")) voiceTone = overrides.get("voiceTone").asText();
                if (overrides.has("defaultLanguage")) defaultLanguage = overrides.get("defaultLanguage").asText();
                if (overrides.has("voiceGuidelinesText"))
                    voiceGuidelinesText = overrides.get("voiceGuidelinesText").asText();
                if (overrides.has("doListText")) doListText = overrides.get("doListText").asText();
                if (overrides.has("dontListText")) dontListText = overrides.get("dontListText").asText();
                if (overrides.has("supportedLanguages"))
                    supportedLanguages = overrides.get("supportedLanguages").toString();
                JsonNode colors = overrides.get("colors");
                if (colors != null) {
                    if (colors.has("primary")) primaryColor = colors.get("primary").asText();
                    if (colors.has("secondary")) secondaryColor = colors.get("secondary").asText();
                    if (colors.has("accent")) accentColor = colors.get("accent").asText();
                }
                JsonNode fonts = overrides.get("fonts");
                if (fonts != null) {
                    if (fonts.has("primary")) fontPrimary = fonts.get("primary").asText();
                    if (fonts.has("secondary")) fontSecondary = fonts.get("secondary").asText();
                }
            } catch (Exception ignored) {
            }
        }

        return new EffectiveBrandProfileResponse(
                org.getId(),
                ws != null ? ws.getId() : null,
                displayName,
                ws != null ? ws.getStatus().name() : org.getStatus().name(),
                primaryColor,
                secondaryColor,
                accentColor,
                fontPrimary,
                fontSecondary,
                org.getLogoAssetId(),
                voiceTone,
                voiceGuidelinesText,
                doListText,
                dontListText,
                defaultLanguage,
                supportedLanguages,
                overridesJson);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
