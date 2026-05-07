package com.avyukt.marketsuite.identity;

import com.avyukt.marketsuite.AbstractIntegrationTest;
import com.avyukt.marketsuite.security.JwtTokenProvider;
import com.avyukt.marketsuite.security.UserPrincipal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class IdentityIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private String adminToken;
    private String analystToken;

    private static final UUID ADMIN_ID = UUID.fromString("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33");
    private static final UUID ANALYST_ID = UUID.fromString("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44");
    private static final UUID ORG_ID = UUID.fromString("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    private static final UUID WS_ID = UUID.fromString("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");

    @BeforeEach
    void setUp() {
        adminToken = tokenProvider.generateToken(new UserPrincipal(
                ADMIN_ID,
                "admin@avyukt.com",
                null,
                "Admin User",
                List.of(new SimpleGrantedAuthority("ROLE_ORG_ADMIN")),
                List.of()));
        analystToken = tokenProvider.generateToken(new UserPrincipal(
                ANALYST_ID,
                "analyst@avyukt.com",
                null,
                "Analyst User",
                List.of(new SimpleGrantedAuthority("ROLE_ANALYST")),
                List.of()));
    }

    @Test
    void createOrg_andListScoping() throws Exception {
        String body = """
                {"name": "Test Org", "timezone": "UTC", "currency": "USD"}
                """;
        mockMvc.perform(post("/api/v1/organizations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Org"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        mockMvc.perform(get("/api/v1/organizations").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))));
    }

    @Test
    void createWorkspace_uniqueConstraint() throws Exception {
        String body = """
                {"name": "US Market", "market": "US"}
                """;
        mockMvc.perform(post("/api/v1/organizations/" + ORG_ID + "/workspaces")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void createInvite_andAccept() throws Exception {
        String inviteBody = """
                {"email": "newguy@example.com", "role": "EDITOR", "expiresInDays": 7}
                """;
        var result = mockMvc
                .perform(post("/api/v1/organizations/" + ORG_ID + "/invites")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(inviteBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inviteLink").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        String inviteLink = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.inviteLink");
        String token = inviteLink.substring(inviteLink.indexOf("token=") + 6);

        String acceptBody = String.format(
                """
                {"token": "%s", "fullName": "New Guy", "password": "securepass123"}
                """,
                token);
        mockMvc.perform(post("/api/v1/invites/accept")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(acceptBody))
                .andExpect(status().isOk());
    }

    @Test
    void rbac_editorCannotChangeRoles() throws Exception {
        String body = """
                {"role": "VIEWER"}
                """;
        mockMvc.perform(patch("/api/v1/organizations/" + ORG_ID + "/members/"
                                + UUID.randomUUID())
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void rbac_orgAdminCanManageMembers() throws Exception {
        mockMvc.perform(get("/api/v1/organizations/" + ORG_ID + "/members")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void listWorkspaces() throws Exception {
        mockMvc.perform(get("/api/v1/organizations/" + ORG_ID + "/workspaces")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));
    }

    @Test
    void listTeams() throws Exception {
        mockMvc.perform(get("/api/v1/organizations/" + ORG_ID + "/teams")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void listAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/organizations/" + ORG_ID + "/audit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
