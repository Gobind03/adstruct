package com.avyukt.marketsuite;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.avyukt.marketsuite.campaign.domain.ApprovalState;
import com.avyukt.marketsuite.campaign.repo.ApprovalWorkflowRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * End-to-end AI module tests against a real PostgreSQL (Testcontainers), Flyway schema, and seeded org
 * / workspace. JWTs carry the authenticated user id in the {@code sub} claim; {@link
 * com.avyukt.marketsuite.security.JwtAuthenticationFilter} loads roles from persisted memberships.
 */
@AutoConfigureMockMvc
@Transactional
class AiIntegrationTest extends AbstractIntegrationTest {

    private static final String JWT_SECRET =
            "test-secret-key-for-testing-only-must-be-at-least-256-bits-long-enough";

    private static final UUID ADMIN_USER_ID = UUID.fromString("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33");
    private static final UUID ANALYST_USER_ID = UUID.fromString("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44");

    private static final UUID ORG_ID = UUID.fromString("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    private static final UUID WORKSPACE_ID = UUID.fromString("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");

    private static final SecretKey JWT_KEY = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApprovalWorkflowRepository approvalWorkflowRepository;

    private String adminToken;
    private String analystToken;

    /**
     * Builds an access JWT compatible with {@code app.jwt.secret} in {@code application-test.yml}. The
     * subject is the user's id; roles are not embedded and must exist in {@code memberships}.
     */
    static String buildJwtForUser(UUID userId) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", userId + "@test.local")
                .claim("name", "Test User " + userId)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 3_600_000L))
                .signWith(JWT_KEY)
                .compact();
    }

    @BeforeEach
    void setUp() throws Exception {
        adminToken = buildJwtForUser(ADMIN_USER_ID);
        analystToken = buildJwtForUser(ANALYST_USER_ID);

        seedMockProviderAndWorkspaceDefault();
    }

    private void seedMockProviderAndWorkspaceDefault() throws Exception {
        MvcResult accResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "platformType": "CHATGPT_ADS",
                                  "displayName": "Mock LLM integration",
                                  "authType": "API_KEY",
                                  "secretPayload": {"apiKey": "mock-key-not-used"},
                                  "scopesJson": "[]"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        UUID integrationAccountId =
                UUID.fromString(readJson(accResult).get("id").asText());

        MvcResult provResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/ai/providers")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "integrationAccountId": "%s",
                                  "providerType": "MOCK",
                                  "defaultModel": "mock-gpt",
                                  "enabled": true
                                }
                                """
                                        .formatted(integrationAccountId)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID providerConfigId = UUID.fromString(readJson(provResult).get("id").asText());

        mockMvc.perform(post("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/provider-preferences")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "providerConfigId": "%s",
                                  "isDefault": true,
                                  "allowedModels": "[]",
                                  "policyJson": "{}"
                                }
                                """
                                        .formatted(providerConfigId)))
                .andExpect(status().isCreated());
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private UUID createConversation(String title) throws Exception {
        MvcResult r = mockMvc.perform(post("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/conversations")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {"title": "%s", "agentMode": "TOOL_ASSISTED"}
                                """
                                        .formatted(title)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(readJson(r).get("id").asText());
    }

    @Test
    void testCreateConversationAndPostMessage() throws Exception {
        UUID conversationId = createConversation("Research chat");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Please search market insights for Q1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assistantMessage.role").value("ASSISTANT"))
                .andExpect(jsonPath("$.assistantMessage.content").value(containsString("Based on your request")))
                .andExpect(jsonPath("$.toolCalls", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.toolCalls[0].toolName").exists());
    }

    @Test
    void testSafetyBlocksBannedPhrases() throws Exception {
        mockMvc.perform(patch("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/safety/policy")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "policyJson": "{\\"bannedPhrases\\":[\\"forbidden-phrase-xyz\\"],\\"allowedTools\\":[\\"*\\"]}"
                                }
                                """))
                .andExpect(status().isOk());

        UUID conversationId = createConversation("Safety test");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                "{\"content\": \"Explain forbidden-phrase-xyz in detail\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assistantMessage.role").value("SYSTEM"))
                .andExpect(jsonPath("$.assistantMessage.content").value(containsString("safety policies")))
                .andExpect(jsonPath("$.toolCalls").isEmpty());
    }

    @Test
    void testRedactionRulesApplied() throws Exception {
        mockMvc.perform(post("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/safety/redaction-rules")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Strip analysis word",
                                  "pattern": "(?i)analysis",
                                  "replacement": "[REDACTED]",
                                  "enabled": true
                                }
                                """))
                .andExpect(status().isCreated());

        UUID conversationId = createConversation("Redaction test");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Hello\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[1].role").value("ASSISTANT"))
                .andExpect(jsonPath("$.messages[1].content").value(containsString("[REDACTED]")));
    }

    @Test
    void testProposalCreationTriggersApproval() throws Exception {
        UUID conversationId = createConversation("Proposal flow");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Please create a workspace settings change\"}"))
                .andExpect(status().isOk());

        MvcResult listResult = mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/action-proposals")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").exists())
                .andReturn();

        UUID proposalId = UUID.fromString(readJson(listResult).get(0).get("id").asText());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/submit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        Assertions.assertTrue(
                approvalWorkflowRepository
                        .findByEntityTypeAndEntityId("AI_ACTION_PROPOSAL", proposalId)
                        .filter(w -> w.getState() == ApprovalState.IN_REVIEW)
                        .isPresent());
    }

    @Test
    void testApproveAndExecuteProposal() throws Exception {
        UUID conversationId = createConversation("Approve execute");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"We should create a new reporting dashboard\"}"))
                .andExpect(status().isOk());

        MvcResult listResult = mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/action-proposals")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        UUID proposalId = UUID.fromString(readJson(listResult).get(0).get("id").asText());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/submit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("Approved for test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        Assertions.assertTrue(
                approvalWorkflowRepository
                        .findByEntityTypeAndEntityId("AI_ACTION_PROPOSAL", proposalId)
                        .map(w -> w.getState() == ApprovalState.APPROVED)
                        .orElse(false));

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/execute")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EXECUTED"))
                .andExpect(jsonPath("$.executedAt").exists());
    }

    @Test
    void testRbacEnforcement() throws Exception {
        UUID conversationId = createConversation("RBAC");

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/conversations/"
                                + conversationId
                                + "/messages")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"Please propose a change to our ads\"}"))
                .andExpect(status().isOk());

        MvcResult listResult = mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/ai/action-proposals")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        UUID proposalId = UUID.fromString(readJson(listResult).get(0).get("id").asText());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/submit")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/approve")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("nope"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Forbidden"));

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("ok"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/ai/action-proposals/"
                                + proposalId
                                + "/execute")
                        .header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Forbidden"));
    }
}
