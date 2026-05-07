package com.avyukt.marketsuite.integration;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

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

@AutoConfigureMockMvc
class IntegrationHubIntegrationTest extends AbstractIntegrationTest {

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
    void providerListReturnsSeededProviders() throws Exception {
        mockMvc.perform(get("/api/v1/integration-providers").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(28))))
                .andExpect(jsonPath("$[?(@.platformType == 'META')]").exists())
                .andExpect(jsonPath("$[?(@.platformType == 'GOOGLE_ADS')]").exists());
    }

    @Test
    void providerByPlatformType() throws Exception {
        mockMvc.perform(get("/api/v1/integration-providers/META").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.platformType").value("META"))
                .andExpect(jsonPath("$.displayName").value("Meta Ads"))
                .andExpect(jsonPath("$.category").value("ADS"));
    }

    @Test
    void providerFilterByCategory() throws Exception {
        mockMvc.perform(get("/api/v1/integration-providers?category=ADS").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(7))));
    }

    @Test
    void createAccountStoresNoSecrets() throws Exception {
        String body =
                """
                {"platformType":"CHATGPT_ADS","displayName":"My ChatGPT Account","authType":"API_KEY","secretPayload":{"apiKey":"sk-test-key-123"},"scopesJson":"[]"}
                """;
        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.displayName").value("My ChatGPT Account"))
                .andExpect(jsonPath("$.platformType").value("CHATGPT_ADS"))
                .andExpect(jsonPath("$.status").value("CONNECTED"))
                .andExpect(jsonPath("$.secretRef").doesNotExist())
                .andExpect(jsonPath("$.secretPayload").doesNotExist());
    }

    @Test
    void listAccountsByOrg() throws Exception {
        mockMvc.perform(get("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void rotateSecretsAndAudit() throws Exception {
        String createBody =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Rotate Test Account","authType":"API_KEY","secretPayload":{"apiKey":"old-key"},"scopesJson":"[]"}
                """;
        var createResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String accountId = com.jayway.jsonpath.JsonPath.read(
                createResult.getResponse().getContentAsString(), "$.id");

        String rotateBody = """
                {"secretPayload":{"apiKey":"new-key-456"}}
                """;
        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts/" + accountId + "/secrets/rotate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(rotateBody))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/organizations/" + ORG_ID + "/audit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.action == 'ROTATE_SECRET')]").exists());
    }

    @Test
    void validateConnection() throws Exception {
        String createBody =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Validate Test","authType":"API_KEY","secretPayload":{"apiKey":"test"},"scopesJson":"[]"}
                """;
        var createResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String accountId = com.jayway.jsonpath.JsonPath.read(
                createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts/" + accountId + "/validate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lastValidatedAt").isNotEmpty());
    }

    @Test
    void disconnectAccount() throws Exception {
        String createBody =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Disconnect Test","authType":"API_KEY","secretPayload":{"apiKey":"key"},"scopesJson":"[]"}
                """;
        var createResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();

        String accountId = com.jayway.jsonpath.JsonPath.read(
                createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts/" + accountId + "/disconnect")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DISCONNECTED"));
    }

    @Test
    void workspaceMappingEnforcesDefault() throws Exception {
        String createBody =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Default Test 1","authType":"API_KEY","secretPayload":{"apiKey":"key1"},"scopesJson":"[]"}
                """;
        var result1 = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();
        String accountId1 = com.jayway.jsonpath.JsonPath.read(
                result1.getResponse().getContentAsString(), "$.id");

        String mapBody = String.format("""
                {"accountId":"%s","enabled":true,"isDefault":true}
                """, accountId1);
        mockMvc.perform(post("/api/v1/workspaces/" + WS_ID + "/integrations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isDefault").value(true));
    }

    @Test
    void syncJobStateTransitions() throws Exception {
        String createAcct =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Sync Test","authType":"API_KEY","secretPayload":{"apiKey":"key"},"scopesJson":"[]"}
                """;
        var acctResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createAcct))
                .andExpect(status().isCreated())
                .andReturn();
        String accountId = com.jayway.jsonpath.JsonPath.read(
                acctResult.getResponse().getContentAsString(), "$.id");

        String jobBody = String.format("""
                {"accountId":"%s","mode":"FULL"}
                """, accountId);
        var jobResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/sync-jobs")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jobBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("QUEUED"))
                .andReturn();
        String jobId = com.jayway.jsonpath.JsonPath.read(
                jobResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/sync-jobs/" + jobId + "/run")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));
    }

    @Test
    void oauthConfigListReturnsSeeded() throws Exception {
        mockMvc.perform(get("/api/v1/admin/oauth-configs").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(6))))
                .andExpect(jsonPath("$[?(@.platformType == 'META')]").exists());
    }

    @Test
    void healthEndpointReturnsHealthy() throws Exception {
        String createBody =
                """
                {"platformType":"CHATGPT_ADS","displayName":"Health Test","authType":"API_KEY","secretPayload":{"apiKey":"key"},"scopesJson":"[]"}
                """;
        var createResult = mockMvc
                .perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();
        String accountId = com.jayway.jsonpath.JsonPath.read(
                createResult.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(get("/api/v1/orgs/" + ORG_ID + "/integrations/accounts/" + accountId + "/health")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.overallStatus").exists())
                .andExpect(jsonPath("$.warnings").isArray());
    }
}
