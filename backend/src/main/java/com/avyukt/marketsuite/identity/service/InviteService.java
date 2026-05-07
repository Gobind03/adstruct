package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.InviteAcceptRequest;
import com.avyukt.marketsuite.identity.api.dto.InviteCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.InviteResponse;
import com.avyukt.marketsuite.identity.domain.*;
import com.avyukt.marketsuite.identity.repo.*;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InviteService {

    private final InviteRepository inviteRepository;
    private final OrganizationRepository organizationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final SecureRandom secureRandom = new SecureRandom();

    public InviteService(
            InviteRepository inviteRepository,
            OrganizationRepository organizationRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.inviteRepository = inviteRepository;
        this.organizationRepository = organizationRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public InviteResponse createInvite(UUID orgId, InviteCreateRequest request) {
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

        boolean pendingExists;
        if (request.workspaceId() != null) {
            pendingExists = inviteRepository.existsByOrgIdAndWorkspaceIdAndEmailAndStatus(
                    orgId, request.workspaceId(), request.email(), InviteStatus.PENDING);
        } else {
            pendingExists = inviteRepository.existsByOrgIdAndEmailAndStatusAndWorkspaceIsNull(
                    orgId, request.email(), InviteStatus.PENDING);
        }
        if (pendingExists) {
            throw new BusinessException("A pending invite already exists for this email in this scope");
        }

        String rawToken = generateToken();
        String tokenHash = passwordEncoder.encode(rawToken);
        int expiryDays = request.expiresInDays() != null ? request.expiresInDays() : 7;

        AppUser invitedBy = userRepository.findById(actorId).orElseThrow();

        Invite invite = Invite.builder()
                .org(org)
                .workspace(workspace)
                .email(request.email())
                .role(request.role())
                .tokenHash(tokenHash)
                .status(InviteStatus.PENDING)
                .invitedBy(invitedBy)
                .expiresAt(OffsetDateTime.now().plusDays(expiryDays))
                .build();
        Invite saved = inviteRepository.save(invite);

        String inviteLink = "http://localhost:4200/invite/accept?token=" + rawToken;
        emailService.sendInvite(request.email(), inviteLink, org.getName());

        auditService.log(orgId, request.workspaceId(), actorId, "CREATE", "INVITE", saved.getId(), null, toJson(saved));
        return toResponse(saved, inviteLink);
    }

    @Transactional(readOnly = true)
    public List<InviteResponse> listInvites(UUID orgId, InviteStatus status, UUID workspaceId) {
        List<Invite> invites;
        if (workspaceId != null && status != null) {
            invites = inviteRepository.findByOrgIdAndWorkspaceIdAndStatus(orgId, workspaceId, status);
        } else if (workspaceId != null) {
            invites = inviteRepository.findByOrgIdAndWorkspaceId(orgId, workspaceId);
        } else if (status != null) {
            invites = inviteRepository.findByOrgIdAndStatus(orgId, status);
        } else {
            invites = inviteRepository.findByOrgId(orgId);
        }
        return invites.stream().map(i -> toResponse(i, null)).toList();
    }

    public void acceptInvite(InviteAcceptRequest request) {
        List<Invite> pendingInvites = inviteRepository.findAll().stream()
                .filter(i -> i.getStatus() == InviteStatus.PENDING)
                .filter(i -> passwordEncoder.matches(request.token(), i.getTokenHash()))
                .toList();

        if (pendingInvites.isEmpty()) {
            throw new BusinessException("Invalid or expired invite token");
        }

        Invite invite = pendingInvites.getFirst();
        if (invite.isExpired()) {
            invite.setStatus(InviteStatus.EXPIRED);
            inviteRepository.save(invite);
            throw new BusinessException("Invite has expired");
        }

        AppUser user = userRepository.findByEmail(invite.getEmail()).orElseGet(() -> AppUser.builder()
                .email(invite.getEmail())
                .fullName(request.fullName())
                .status(UserStatus.ACTIVE)
                .passwordHash(passwordEncoder.encode(request.password()))
                .build());

        if (user.getId() != null) {
            user.setFullName(request.fullName());
            user.setPasswordHash(passwordEncoder.encode(request.password()));
            user.setStatus(UserStatus.ACTIVE);
        }
        user = userRepository.save(user);

        Membership membership = Membership.builder()
                .user(user)
                .org(invite.getOrg())
                .workspace(invite.getWorkspace())
                .role(invite.getRole())
                .build();
        membershipRepository.save(membership);

        invite.setStatus(InviteStatus.ACCEPTED);
        inviteRepository.save(invite);

        auditService.log(
                invite.getOrg().getId(),
                invite.getWorkspace() != null ? invite.getWorkspace().getId() : null,
                user.getId(),
                "ACCEPT",
                "INVITE",
                invite.getId(),
                null,
                toJson(invite));
    }

    public InviteResponse revokeInvite(UUID orgId, UUID inviteId) {
        UUID actorId = SecurityUtils.currentUserId();
        Invite invite = inviteRepository
                .findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite", "id", inviteId));

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new BusinessException("Can only revoke pending invites");
        }

        String beforeJson = toJson(invite);
        invite.setStatus(InviteStatus.REVOKED);
        Invite saved = inviteRepository.save(invite);

        auditService.log(orgId, null, actorId, "REVOKE", "INVITE", inviteId, beforeJson, toJson(saved));
        return toResponse(saved, null);
    }

    public InviteResponse resendInvite(UUID orgId, UUID inviteId) {
        UUID actorId = SecurityUtils.currentUserId();
        Invite invite = inviteRepository
                .findById(inviteId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite", "id", inviteId));

        String rawToken = generateToken();
        invite.setTokenHash(passwordEncoder.encode(rawToken));
        invite.setExpiresAt(OffsetDateTime.now().plusDays(7));
        invite.setStatus(InviteStatus.PENDING);
        Invite saved = inviteRepository.save(invite);

        String inviteLink = "http://localhost:4200/invite/accept?token=" + rawToken;
        emailService.sendInvite(
                invite.getEmail(), inviteLink, invite.getOrg().getName());

        auditService.log(orgId, null, actorId, "RESEND", "INVITE", inviteId, null, toJson(saved));
        return toResponse(saved, inviteLink);
    }

    private String generateToken() {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private InviteResponse toResponse(Invite invite, String inviteLink) {
        return new InviteResponse(
                invite.getId(),
                invite.getOrg().getId(),
                invite.getWorkspace() != null ? invite.getWorkspace().getId() : null,
                invite.getEmail(),
                invite.getRole(),
                invite.getStatus(),
                inviteLink,
                invite.getInvitedBy() != null ? invite.getInvitedBy().getId() : null,
                invite.getExpiresAt(),
                invite.getCreatedAt());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
