package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Membership;
import com.avyukt.marketsuite.identity.repo.MembershipRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PermissionService {

    private final MembershipRepository membershipRepository;

    public PermissionService(MembershipRepository membershipRepository) {
        this.membershipRepository = membershipRepository;
    }

    public void requireOrgRole(UUID orgId, MemberRole... rolesAllowed) {
        UUID userId = SecurityUtils.currentUserId();
        List<MemberRole> allowed = Arrays.asList(rolesAllowed);

        var orgMembership = membershipRepository.findOrgLevelMembership(userId, orgId);
        if (orgMembership.isPresent() && allowed.contains(orgMembership.get().getRole())) {
            return;
        }

        if (orgMembership.isPresent() && orgMembership.get().getRole() == MemberRole.ORG_ADMIN) {
            return;
        }

        List<Membership> allMemberships = membershipRepository.findByUserId(userId);
        boolean hasOrgAccess = allMemberships.stream()
                .anyMatch(m -> m.getOrg().getId().equals(orgId) && allowed.contains(m.getRole()));

        if (!hasOrgAccess) {
            throw new AccessDeniedException("Insufficient permissions for this organization");
        }
    }

    public void requireWorkspaceRole(UUID orgId, UUID workspaceId, MemberRole... rolesAllowed) {
        UUID userId = SecurityUtils.currentUserId();
        List<MemberRole> allowed = Arrays.asList(rolesAllowed);

        var orgMembership = membershipRepository.findOrgLevelMembership(userId, orgId);
        if (orgMembership.isPresent() && orgMembership.get().getRole() == MemberRole.ORG_ADMIN) {
            return;
        }

        if (orgMembership.isPresent() && allowed.contains(orgMembership.get().getRole())) {
            return;
        }

        if (workspaceId != null) {
            var wsMembership =
                    membershipRepository.findByUserIdAndOrgIdAndWorkspaceId(userId, orgId, workspaceId);
            if (wsMembership.isPresent() && allowed.contains(wsMembership.get().getRole())) {
                return;
            }
        }

        throw new AccessDeniedException("Insufficient permissions for this workspace");
    }

    public boolean canReadOrg(UUID orgId) {
        UUID userId = SecurityUtils.currentUserId();
        List<Membership> memberships = membershipRepository.findByUserId(userId);
        return memberships.stream().anyMatch(m -> m.getOrg().getId().equals(orgId));
    }

    public boolean canManageMembers(UUID orgId) {
        UUID userId = SecurityUtils.currentUserId();
        var orgMembership = membershipRepository.findOrgLevelMembership(userId, orgId);
        return orgMembership.isPresent()
                && (orgMembership.get().getRole() == MemberRole.ORG_ADMIN
                        || orgMembership.get().getRole() == MemberRole.WORKSPACE_ADMIN);
    }

    public boolean canManageWorkspaces(UUID orgId) {
        UUID userId = SecurityUtils.currentUserId();
        var orgMembership = membershipRepository.findOrgLevelMembership(userId, orgId);
        return orgMembership.isPresent() && orgMembership.get().getRole() == MemberRole.ORG_ADMIN;
    }

    public void requireOrgAccess(UUID orgId) {
        if (!canReadOrg(orgId)) {
            throw new AccessDeniedException("You do not have access to this organization");
        }
    }

    public void requireBrandOrgManagement(UUID orgId) {
        requireOrgRole(orgId, MemberRole.ORG_ADMIN);
    }

    public void requireBrandWorkspaceManagement(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
    }

    public void requireTemplateApproval(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.APPROVER);
    }

    // ── AI Platform Layer permissions ──────────────────────────

    public void requireAiUse(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST,
                MemberRole.APPROVER);
    }

    public void requireAiOrgManagement(UUID orgId) {
        requireOrgRole(orgId, MemberRole.ORG_ADMIN);
    }

    public void requireAiWorkspaceManagement(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
    }

    public void requireAiActionApproval(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.APPROVER);
    }

    public void requireAiActionExecution(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
    }

    public boolean canUseAi(UUID orgId, UUID workspaceId) {
        try {
            requireAiUse(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canManageAiOrg(UUID orgId) {
        try {
            requireAiOrgManagement(orgId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canManageAiWorkspace(UUID orgId, UUID workspaceId) {
        try {
            requireAiWorkspaceManagement(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canApproveAiActions(UUID orgId, UUID workspaceId) {
        try {
            requireAiActionApproval(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canExecuteAiActions(UUID orgId, UUID workspaceId) {
        try {
            requireAiActionExecution(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    // ── Research & Intelligence permissions ─────────────────────

    public void requireResearchManagement(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
    }

    public void requireResearchAnalyst(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST);
    }

    public void requireResearchAiUse(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST);
    }

    public void requireResearchPublish(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN);
    }

    public void requireResearchRead(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST,
                MemberRole.VIEWER);
    }

    public boolean canManageResearch(UUID orgId, UUID workspaceId) {
        try {
            requireResearchManagement(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canRunResearchAi(UUID orgId, UUID workspaceId) {
        try {
            requireResearchAiUse(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canPublishResearch(UUID orgId, UUID workspaceId) {
        try {
            requireResearchPublish(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    // ── Creative Studio permissions ─────────────────────────────

    public void requireCreativeManagement(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.EDITOR);
    }

    public void requireCreativeAiUse(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST);
    }

    public void requireCreativeRead(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId,
                workspaceId,
                MemberRole.ORG_ADMIN,
                MemberRole.WORKSPACE_ADMIN,
                MemberRole.EDITOR,
                MemberRole.ANALYST,
                MemberRole.VIEWER);
    }

    public void requireCreativeApproval(UUID orgId, UUID workspaceId) {
        requireWorkspaceRole(
                orgId, workspaceId, MemberRole.ORG_ADMIN, MemberRole.WORKSPACE_ADMIN, MemberRole.APPROVER);
    }

    public boolean canManageCreative(UUID orgId, UUID workspaceId) {
        try {
            requireCreativeManagement(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    public boolean canRunCreativeAi(UUID orgId, UUID workspaceId) {
        try {
            requireCreativeAiUse(orgId, workspaceId);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }
}
