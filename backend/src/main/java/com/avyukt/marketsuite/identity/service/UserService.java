package com.avyukt.marketsuite.identity.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.api.dto.*;
import com.avyukt.marketsuite.identity.api.mapper.UserMapper;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Membership;
import com.avyukt.marketsuite.identity.repo.MembershipRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository repository;
    private final UserMapper mapper;
    private final MembershipRepository membershipRepository;

    public UserService(UserRepository repository, UserMapper mapper, MembershipRepository membershipRepository) {
        this.repository = repository;
        this.mapper = mapper;
        this.membershipRepository = membershipRepository;
    }

    public Page<UserResponse> findAll(Pageable pageable) {
        return repository.findAll(pageable).map(mapper::toResponse);
    }

    public UserResponse findById(UUID id) {
        AppUser user =
                repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return mapper.toResponse(user);
    }

    public UserResponse findByEmail(String email) {
        AppUser user = repository
                .findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return mapper.toResponse(user);
    }

    public UserProfileResponse getProfile(UUID userId) {
        AppUser user =
                repository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        List<Membership> memberships = membershipRepository.findByUserId(userId);
        List<MembershipResponse> membershipResponses = memberships.stream()
                .map(m -> new MembershipResponse(
                        m.getId(),
                        m.getUser().getId(),
                        m.getOrg().getId(),
                        m.getWorkspace() != null ? m.getWorkspace().getId() : null,
                        m.getRole(),
                        m.getCreatedAt()))
                .toList();
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getStatus(),
                membershipResponses,
                user.getCreatedAt(),
                user.getUpdatedAt());
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UserUpdateRequest request) {
        AppUser user =
                repository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        user.setFullName(request.fullName());
        return mapper.toResponse(repository.save(user));
    }

    public UUID currentUserId() {
        return SecurityUtils.currentUserId();
    }
}
