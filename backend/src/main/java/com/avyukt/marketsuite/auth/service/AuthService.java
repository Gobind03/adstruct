package com.avyukt.marketsuite.auth.service;

import com.avyukt.marketsuite.auth.dto.LoginRequest;
import com.avyukt.marketsuite.auth.dto.LoginResponse;
import com.avyukt.marketsuite.auth.dto.RefreshRequest;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.repo.MembershipRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.security.JwtTokenProvider;
import com.avyukt.marketsuite.security.UserPrincipal;
import java.util.UUID;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final MembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(
            UserRepository userRepository,
            MembershipRepository membershipRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    public LoginResponse authenticate(LoginRequest request) {
        AppUser user = userRepository
                .findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        var memberships = membershipRepository.findByUserId(user.getId());
        UserPrincipal principal = UserPrincipal.fromUser(user, memberships);

        String accessToken = tokenProvider.generateToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        return new LoginResponse(accessToken, refreshToken, "Bearer", tokenProvider.getExpirationMs());
    }

    public LoginResponse refresh(RefreshRequest request) {
        if (!tokenProvider.validateToken(request.refreshToken())) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        UUID userId = tokenProvider.getUserIdFromToken(request.refreshToken());
        AppUser user = userRepository
                .findById(userId)
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        var memberships = membershipRepository.findByUserId(user.getId());
        UserPrincipal principal = UserPrincipal.fromUser(user, memberships);

        String accessToken = tokenProvider.generateToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        return new LoginResponse(accessToken, refreshToken, "Bearer", tokenProvider.getExpirationMs());
    }
}
