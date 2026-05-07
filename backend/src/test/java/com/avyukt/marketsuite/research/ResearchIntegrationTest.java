package com.avyukt.marketsuite.research;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.avyukt.marketsuite.AbstractIntegrationTest;
import com.avyukt.marketsuite.auth.dto.LoginResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Ordered integration tests for Research &amp; Intelligence. Uses seeded workspace/org and admin login;
 * AI flows require a MOCK provider wired for the workspace (seeded once before all tests).
 */
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ResearchIntegrationTest extends AbstractIntegrationTest {

    private static final UUID WORKSPACE_ID = UUID.fromString("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");
    private static final UUID ORG_ID = UUID.fromString("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    /** Fake template id for cross-module research link (no template row required for link creation). */
    private static final UUID FAKE_TEMPLATE_ID = UUID.fromString("f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f99");

    private static UUID competitorId;
    private static UUID snapshotId;
    private static UUID insightId;
    private static UUID watchlistId;
    private static UUID researchLinkId;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String accessToken;

    @BeforeAll
    void loginAndSeedMockAi() throws Exception {
        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {"email":"admin@avyukt.com","password":"password"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();
        LoginResponse login = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(), LoginResponse.class);
        accessToken = login.accessToken();

        MvcResult accResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/integrations/accounts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "platformType": "CHATGPT_ADS",
                                  "displayName": "Research test MOCK LLM",
                                  "authType": "API_KEY",
                                  "secretPayload": {"apiKey": "mock-key-not-used"},
                                  "scopesJson": "[]"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        UUID integrationAccountId = UUID.fromString(readJson(accResult).get("id").asText());

        MvcResult provResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/ai/providers")
                        .header("Authorization", "Bearer " + accessToken)
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
                        .header("Authorization", "Bearer " + accessToken)
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

    @Test
    @Order(1)
    void test1_competitorCrud() throws Exception {
        String base = "/api/v1/workspaces/" + WORKSPACE_ID + "/research/competitors";

        MvcResult create = mockMvc.perform(post(base)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Test Corp",
                                  "websiteUrl": "https://testcorp.example",
                                  "description": "Integration test competitor"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Test Corp"))
                .andExpect(jsonPath("$.websiteUrl").value("https://testcorp.example"))
                .andReturn();
        competitorId = UUID.fromString(readJson(create).get("id").asText());

        mockMvc.perform(get(base + "/" + competitorId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(competitorId.toString()))
                .andExpect(jsonPath("$.name").value("Test Corp"))
                .andExpect(jsonPath("$.websiteUrl").value("https://testcorp.example"));

        mockMvc.perform(patch(base + "/" + competitorId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test Corporation\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Corporation"));

        mockMvc.perform(get(base).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))));
    }

    @Test
    @Order(2)
    void test2_sourceAndSnapshotIngestion() throws Exception {
        String url = "/api/v1/workspaces/" + WORKSPACE_ID + "/research/ingest/url";
        MvcResult ingest = mockMvc.perform(post(url)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "title": "Test URL source",
                                  "url": "https://example.com/research-test",
                                  "competitorId": "%s",
                                  "rawText": "Preserved raw crawl text for integration test."
                                }
                                """
                                        .formatted(competitorId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sourceId").isNotEmpty())
                .andExpect(jsonPath("$.snapshotId").isNotEmpty())
                .andExpect(jsonPath("$.jobId").isNotEmpty())
                .andReturn();
        var body = readJson(ingest);
        snapshotId = UUID.fromString(body.get("snapshotId").asText());

        mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/research/snapshots/" + snapshotId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rawText").value("Preserved raw crawl text for integration test."));
    }

    @Test
    @Order(3)
    void test3_insightCrudEvidencePublish() throws Exception {
        String base = "/api/v1/workspaces/" + WORKSPACE_ID + "/research/insights";
        MvcResult create = mockMvc.perform(post(base)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "category": "COMPETITOR",
                                  "insightType": "COMPETITOR_OFFER",
                                  "title": "Publish flow insight",
                                  "summary": "Draft summary"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        insightId = UUID.fromString(readJson(create).get("id").asText());

        mockMvc.perform(post(base + "/" + insightId + "/publish")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.title").value("Business Rule Violation"));

        mockMvc.perform(post(base + "/" + insightId + "/evidence")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "snapshotId": "%s",
                                  "citationText": "Evidence from snapshot",
                                  "citationUrl": "https://example.com/research-test"
                                }
                                """
                                        .formatted(snapshotId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.snapshotId").value(snapshotId.toString()));

        mockMvc.perform(post(base + "/" + insightId + "/publish")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        mockMvc.perform(get(base + "/" + insightId).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.evidenceCount").value(greaterThanOrEqualTo(1)));
    }

    @Test
    @Order(4)
    void test4_aiSummarizeSnapshot() throws Exception {
        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/research/ai/snapshots/"
                                + snapshotId
                                + "/summarize")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\":\"en\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summary").isNotEmpty())
                .andExpect(jsonPath("$.keyPoints").isArray())
                .andExpect(jsonPath("$.runId").isNotEmpty())
                .andExpect(jsonPath("$.aiLinkId").isNotEmpty());

        mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/research/snapshots/" + snapshotId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.summaryText").isNotEmpty());
    }

    @Test
    @Order(5)
    void test5_aiExtractCompetitorInsights() throws Exception {
        mockMvc.perform(post("/api/v1/workspaces/"
                                + WORKSPACE_ID
                                + "/research/ai/competitors/"
                                + competitorId
                                + "/extract")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "snapshotIds": ["%s"],
                                  "insightTypes": ["COMPETITOR_OFFER"],
                                  "language": "en"
                                }
                                """
                                        .formatted(snapshotId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdInsightIds", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.runId").isNotEmpty());
    }

    @Test
    @Order(6)
    void test6_aiKeywordClustering() throws Exception {
        mockMvc.perform(post("/api/v1/workspaces/" + WORKSPACE_ID + "/research/ai/keywords/cluster")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "keywords": ["buy shoes", "running shoes", "best sneakers"],
                                  "language": "en"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdClusterIds", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.runId").isNotEmpty());
    }

    @Test
    @Order(7)
    void test7_aiLinksBrowsing() throws Exception {
        mockMvc.perform(get("/api/v1/workspaces/" + WORKSPACE_ID + "/research/ai/links")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$[0].id").isNotEmpty());
    }

    @Test
    @Order(8)
    void test8_watchlistAndRefresh() throws Exception {
        String base = "/api/v1/workspaces/" + WORKSPACE_ID + "/research/watchlists";
        MvcResult created = mockMvc.perform(post(base)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "watchlistType": "COMPETITOR",
                                  "name": "Integration test watchlist",
                                  "competitorId": "%s",
                                  "frequency": "MANUAL"
                                }
                                """
                                        .formatted(competitorId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        watchlistId = UUID.fromString(readJson(created).get("id").asText());

        mockMvc.perform(post(base + "/" + watchlistId + "/refresh")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.jobType").isNotEmpty());
    }

    @Test
    @Order(9)
    void test9_researchLinksCrossModule() throws Exception {
        String base = "/api/v1/workspaces/" + WORKSPACE_ID + "/research/links";
        MvcResult created = mockMvc.perform(post(base)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "researchEntityType": "INSIGHT",
                                  "researchEntityId": "%s",
                                  "linkedEntityType": "TEMPLATE",
                                  "linkedEntityId": "%s",
                                  "relationType": "USED_IN",
                                  "note": "Cross-module link from integration test"
                                }
                                """
                                        .formatted(insightId, FAKE_TEMPLATE_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();
        researchLinkId = UUID.fromString(readJson(created).get("id").asText());

        mockMvc.perform(get(base)
                        .param("researchEntityType", "INSIGHT")
                        .param("researchEntityId", insightId.toString())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(researchLinkId.toString())));
    }
}
