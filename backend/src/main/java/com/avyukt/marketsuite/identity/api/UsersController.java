package com.avyukt.marketsuite.identity.api;

import com.avyukt.marketsuite.identity.api.dto.UserProfileResponse;
import com.avyukt.marketsuite.identity.api.dto.UserResponse;
import com.avyukt.marketsuite.identity.api.dto.UserUpdateRequest;
import com.avyukt.marketsuite.identity.service.UserService;
import com.avyukt.marketsuite.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@Tag(name = "Users")
@SecurityRequirement(name = "bearerAuth")
public class UsersController {

    private final UserService service;

    public UsersController(UserService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List users")
    public ResponseEntity<Page<UserResponse>> list(Pageable pageable) {
        return ResponseEntity.ok(service.findAll(pageable));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user with memberships")
    public ResponseEntity<UserProfileResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(service.getProfile(principal.getId()));
    }

    @PatchMapping("/me")
    @Operation(summary = "Update current user profile")
    public ResponseEntity<UserResponse> updateMe(
            @AuthenticationPrincipal UserPrincipal principal, @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(service.updateProfile(principal.getId(), request));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }
}
