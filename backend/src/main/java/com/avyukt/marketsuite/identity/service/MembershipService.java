package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.MemberCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.MemberDetailResponse;
import com.avyukt.marketsuite.identity.api.dto.MemberUpdateRequest;
import com.avyukt.marketsuite.identity.domain.*;
import com.avyukt.marketsuite.identity.repo.*;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class MembershipService {

    private final MembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public MembershipService(
            MembershipRepository membershipRepository,
            UserRepository userRepository,
            OrganizationRepository organizationRepository,
            WorkspaceRepository workspaceRepository,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.workspaceRepository = workspaceRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<MemberDetailResponse> listMembers(
            UUID orgId, UUID workspaceId, MemberRole role, UserStatus userStatus, String query) {

        List<Membership> memberships;
        if (workspaceId != null) {
            memberships = membershipRepository.findByOrgIdAndWorkspaceIdWithUser(orgId, workspaceId);
        } else {
            memberships = membershipRepository.findByOrgIdWithUser(orgId);
        }

        return memberships.stream()
                .filter(m -> role == null || m.getRole() == role)
                .filter(m -> userStatus == null || m.getUser().getStatus() == userStatus)
                .filter(m -> query == null
                        || query.isEmpty()
                        || m.getUser().getEmail().toLowerCase().contains(query.toLowerCase())
                        || m.getUser().getFullName().toLowerCase().contains(query.toLowerCase()))
                .map(this::toDetailResponse)
                .toList();
    }

    public MemberDetailResponse createMembership(UUID orgId, MemberCreateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Organization org = organizationRepository
                .findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", orgId));

        Workspace workspace = null;
        if (request.workspaceId() != null) {
            workspace = workspaceRepository
                    .findById(request.workspaceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", request.workspaceId()));
        }

        AppUser user = userRepository.findByEmail(request.email()).orElseGet(() -> {
            AppUser newUser = AppUser.builder()
                    .email(request.email())
                    .fullName(request.fullName() != null ? request.fullName() : request.email())
                    .status(UserStatus.INVITED)
                    .build();
            return userRepository.save(newUser);
        });

        if (request.workspaceId() != null) {
            membershipRepository
                    .findByUserIdAndOrgIdAndWorkspaceId(user.getId(), orgId, request.workspaceId())
                    .ifPresent(existing -> {
                        throw new BusinessException("User already has membership in this scope");
                    });
        } else {
            membershipRepository.findOrgLevelMembership(user.getId(), orgId).ifPresent(existing -> {
                throw new BusinessException("User already has org-level membership");
            });
        }

        Membership membership = Membership.builder()
                .user(user)
                .org(org)
                .workspace(workspace)
                .role(request.role())
                .build();
        Membership saved = membershipRepository.save(membership);

        auditService.log(
                orgId,
                request.workspaceId(),
                actorId,
                "CREATE",
                "MEMBERSHIP",
                saved.getId(),
                null,
                toJson(saved));
        return toDetailResponse(saved);
    }

    public MemberDetailResponse updateRole(UUID orgId, UUID membershipId, MemberUpdateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Membership membership = membershipRepository
                .findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", "id", membershipId));
        String beforeJson = toJson(membership);

        membership.setRole(request.role());
        Membership saved = membershipRepository.save(membership);

        auditService.log(
                orgId,
                saved.getWorkspace() != null ? saved.getWorkspace().getId() : null,
                actorId,
                "UPDATE",
                "MEMBERSHIP",
                membershipId,
                beforeJson,
                toJson(saved));
        return toDetailResponse(saved);
    }

    public void deleteMembership(UUID orgId, UUID membershipId) {
        UUID actorId = SecurityUtils.currentUserId();
        Membership membership = membershipRepository
                .findById(membershipId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership", "id", membershipId));
        String beforeJson = toJson(membership);

        membershipRepository.delete(membership);

        auditService.log(
                orgId,
                membership.getWorkspace() != null ? membership.getWorkspace().getId() : null,
                actorId,
                "DELETE",
                "MEMBERSHIP",
                membershipId,
                beforeJson,
                null);
    }

    private MemberDetailResponse toDetailResponse(Membership m) {
        return new MemberDetailResponse(
                m.getId(),
                m.getUser().getId(),
                m.getUser().getEmail(),
                m.getUser().getFullName(),
                m.getUser().getStatus(),
                m.getRole(),
                m.getOrg().getId(),
                m.getWorkspace() != null ? m.getWorkspace().getId() : null,
                m.getWorkspace() != null ? m.getWorkspace().getName() : null,
                m.getCreatedAt());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
