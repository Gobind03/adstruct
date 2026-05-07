package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.TeamCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.TeamMemberResponse;
import com.avyukt.marketsuite.identity.api.dto.TeamResponse;
import com.avyukt.marketsuite.identity.api.dto.TeamUpdateRequest;
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
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final OrganizationRepository organizationRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public TeamService(
            TeamRepository teamRepository,
            TeamMemberRepository teamMemberRepository,
            OrganizationRepository organizationRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.organizationRepository = organizationRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<TeamResponse> listTeams(UUID orgId, UUID workspaceId) {
        List<Team> teams;
        if (workspaceId != null) {
            teams = teamRepository.findByOrgIdAndWorkspaceId(orgId, workspaceId);
        } else {
            teams = teamRepository.findByOrgId(orgId);
        }
        return teams.stream().map(this::toResponse).toList();
    }

    public TeamResponse createTeam(UUID orgId, TeamCreateRequest request) {
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

        Team team = Team.builder()
                .org(org)
                .workspace(workspace)
                .name(request.name())
                .build();
        Team saved = teamRepository.save(team);

        auditService.log(orgId, request.workspaceId(), actorId, "CREATE", "TEAM", saved.getId(), null, toJson(saved));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(UUID teamId) {
        Team team = teamRepository
                .findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        return toResponse(team);
    }

    public TeamResponse updateTeam(UUID orgId, UUID teamId, TeamUpdateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Team team = teamRepository
                .findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        String beforeJson = toJson(team);

        team.setName(request.name());
        Team saved = teamRepository.save(team);

        auditService.log(orgId, null, actorId, "UPDATE", "TEAM", teamId, beforeJson, toJson(saved));
        return toResponse(saved);
    }

    public void deleteTeam(UUID orgId, UUID teamId) {
        UUID actorId = SecurityUtils.currentUserId();
        Team team = teamRepository
                .findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        String beforeJson = toJson(team);

        teamRepository.delete(team);
        auditService.log(orgId, null, actorId, "DELETE", "TEAM", teamId, beforeJson, null);
    }

    public TeamMemberResponse addMember(UUID orgId, UUID teamId, UUID userId) {
        UUID actorId = SecurityUtils.currentUserId();
        Team team = teamRepository
                .findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        AppUser user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new BusinessException("User is already a member of this team");
        }

        TeamMember member = TeamMember.builder()
                .team(team)
                .user(user)
                .build();
        TeamMember saved = teamMemberRepository.save(member);

        auditService.log(orgId, null, actorId, "ADD_MEMBER", "TEAM", teamId, null, toJson(saved));
        return new TeamMemberResponse(user.getId(), user.getEmail(), user.getFullName(), saved.getCreatedAt());
    }

    public void removeMember(UUID orgId, UUID teamId, UUID userId) {
        UUID actorId = SecurityUtils.currentUserId();
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ResourceNotFoundException("TeamMember", "userId", userId);
        }
        teamMemberRepository.deleteByTeamIdAndUserId(teamId, userId);
        auditService.log(orgId, null, actorId, "REMOVE_MEMBER", "TEAM", teamId, null, null);
    }

    private TeamResponse toResponse(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(team.getId());
        List<TeamMemberResponse> memberResponses = members.stream()
                .map(tm -> new TeamMemberResponse(
                        tm.getUser().getId(),
                        tm.getUser().getEmail(),
                        tm.getUser().getFullName(),
                        tm.getCreatedAt()))
                .toList();
        return new TeamResponse(
                team.getId(),
                team.getOrg().getId(),
                team.getWorkspace() != null ? team.getWorkspace().getId() : null,
                team.getName(),
                memberResponses,
                team.getCreatedAt(),
                team.getUpdatedAt());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
