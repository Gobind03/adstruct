package com.avyukt.marketsuite.security;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Not authenticated");
        }
        Object p = auth.getPrincipal();
        if (p instanceof UserPrincipal up) {
            return up.getId();
        }
        throw new IllegalStateException("Unexpected principal");
    }

    public static UserPrincipal currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Not authenticated");
        }
        Object p = auth.getPrincipal();
        if (p instanceof UserPrincipal up) {
            return up;
        }
        throw new IllegalStateException("Unexpected principal");
    }
}
