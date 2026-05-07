package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.OrganizationCreateRequest;
import com.avyukt.marketsuite.identity.api.dto.OrganizationResponse;
import com.avyukt.marketsuite.identity.api.dto.OrganizationUpdateRequest;
import com.avyukt.marketsuite.identity.api.mapper.OrganizationMapper;
import com.avyukt.marketsuite.identity.domain.MemberRole;
import com.avyukt.marketsuite.identity.domain.Membership;
import com.avyukt.marketsuite.identity.domain.Organization;
import com.avyukt.marketsuite.identity.repo.MembershipRepository;
import com.avyukt.marketsuite.identity.repo.OrganizationRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrganizationService {

    private final OrganizationRepository repository;
    private final OrganizationMapper mapper;
    private final MembershipRepository membershipRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public OrganizationService(
            OrganizationRepository repository,
            OrganizationMapper mapper,
            MembershipRepository membershipRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.mapper = mapper;
        this.membershipRepository = membershipRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public OrganizationResponse create(OrganizationCreateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Organization entity = mapper.toEntity(request);
        Organization saved = repository.save(entity);

        var user = userRepository.findById(actorId).orElseThrow();
        Membership orgAdmin = Membership.builder()
                .user(user)
                .org(saved)
                .role(MemberRole.ORG_ADMIN)
                .build();
        membershipRepository.save(orgAdmin);

        auditService.log(saved.getId(), null, actorId, "CREATE", "ORGANIZATION", saved.getId(), null, toJson(saved));
        return toResponseWithCounts(saved);
    }

    @Transactional(readOnly = true)
    public OrganizationResponse findById(UUID id) {
        Organization org =
                repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Organization", "id", id));
        return toResponseWithCounts(org);
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> findAllForCurrentUser() {
        UUID userId = SecurityUtils.currentUserId();
        return repository.findByMemberUserId(userId).stream()
                .map(this::toResponseWithCounts)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrganizationResponse> findAll() {
        return repository.findAll().stream().map(this::toResponseWithCounts).toList();
    }

    public OrganizationResponse update(UUID id, OrganizationUpdateRequest request) {
        UUID actorId = SecurityUtils.currentUserId();
        Organization org =
                repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Organization", "id", id));
        String beforeJson = toJson(org);

        if (request.name() != null) org.setName(request.name());
        if (request.timezone() != null) org.setTimezone(request.timezone());
        if (request.currency() != null) org.setCurrency(request.currency());
        if (request.status() != null) org.setStatus(request.status());

        Organization saved = repository.save(org);
        auditService.log(id, null, actorId, "UPDATE", "ORGANIZATION", id, beforeJson, toJson(saved));
        return toResponseWithCounts(saved);
    }

    private OrganizationResponse toResponseWithCounts(Organization org) {
        long wsCount = workspaceRepository.countByOrgId(org.getId());
        long memberCount = membershipRepository.countByOrgId(org.getId());
        return new OrganizationResponse(
                org.getId(),
                org.getName(),
                org.getTimezone(),
                org.getCurrency(),
                org.getStatus(),
                wsCount,
                memberCount,
                org.getCreatedAt(),
                org.getUpdatedAt());
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
