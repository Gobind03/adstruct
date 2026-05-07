package com.avyukt.marketsuite;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
 * End-to-end Creative Studio tests against PostgreSQL (Testcontainers), Flyway schema, and seeded org /
 * workspace. JWTs carry the authenticated user id in the {@code sub} claim; roles are loaded from
 * persisted memberships. AI tests reuse {@link #seedMockProviderAndWorkspaceDefault()} like {@link
 * AiIntegrationTest}.
 */
@AutoConfigureMockMvc
@Transactional
class CreativeIntegrationTest extends AbstractIntegrationTest {

    private static final String JWT_SECRET =
            "test-secret-key-for-testing-only-must-be-at-least-256-bits-long-enough";

    private static final UUID ADMIN_USER_ID = UUID.fromString("c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33");
    private static final UUID ANALYST_USER_ID = UUID.fromString("d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44");

    private static final UUID ORG_ID = UUID.fromString("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
    private static final UUID WORKSPACE_ID = UUID.fromString("b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22");

    private static final String CREATIVE_BASE = "/api/v1/workspaces/" + WORKSPACE_ID + "/creative";

    private static final SecretKey JWT_KEY = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;
    private String analystToken;

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

    private UUID createAssetAsAdmin() throws Exception {
        MvcResult r = mockMvc.perform(post(CREATIVE_BASE + "/assets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Test Banner",
                                  "assetType": "IMAGE",
                                  "sourceUrl": "https://example.com/banner.png",
                                  "description": "A test banner",
                                  "tags": "[\\"banner\\",\\"test\\"]",
                                  "visibility": "WORKSPACE"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(readJson(r).get("id").asText());
    }

    private UUID createCopyArtifactAsAdmin(String name, String contentText) throws Exception {
        MvcResult r = mockMvc.perform(post(CREATIVE_BASE + "/copy")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "%s",
                                  "type": "AD_COPY",
                                  "contentText": "%s",
                                  "language": "en"
                                }
                                """
                                        .formatted(name, contentText)))
                .andExpect(status().isCreated())
                .andReturn();
        return UUID.fromString(readJson(r).get("id").asText());
    }

    @Test
    void testCreateAndListAssets() throws Exception {
        MvcResult createResult = mockMvc.perform(post(CREATIVE_BASE + "/assets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Test Banner",
                                  "assetType": "IMAGE",
                                  "sourceUrl": "https://example.com/banner.png",
                                  "description": "A test banner",
                                  "tags": "[\\"banner\\",\\"test\\"]",
                                  "visibility": "WORKSPACE"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andReturn();

        UUID assetId = UUID.fromString(readJson(createResult).get("id").asText());
        Assertions.assertNotNull(assetId);

        mockMvc.perform(get(CREATIVE_BASE + "/assets").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Test Banner"));
    }

    @Test
    void testCreateAssetAndAddVersion() throws Exception {
        UUID assetId = createAssetAsAdmin();

        mockMvc.perform(post(CREATIVE_BASE + "/assets/" + assetId + "/versions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "fileUrl": "https://example.com/banner-v2.png",
                                  "versionType": "MINOR",
                                  "changeNotes": "Updated colors"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber").value(1));

        mockMvc.perform(get(CREATIVE_BASE + "/assets/" + assetId + "/versions")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void testCreateAndListCopyArtifacts() throws Exception {
        mockMvc.perform(post(CREATIVE_BASE + "/copy")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Spring Sale Ad",
                                  "type": "AD_COPY",
                                  "contentText": "Get 50% off this spring!",
                                  "language": "en"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get(CREATIVE_BASE + "/copy").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Spring Sale Ad"));
    }

    @Test
    void testUpdateCopyArtifactOnlyDraft() throws Exception {
        UUID copyId = createCopyArtifactAsAdmin("Draft Copy", "Original");

        mockMvc.perform(patch(CREATIVE_BASE + "/copy/" + copyId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contentText\": \"Updated text\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentText").value("Updated text"));
    }

    @Test
    void testArchiveCopyArtifact() throws Exception {
        UUID copyId = createCopyArtifactAsAdmin("To Archive", "Body");

        mockMvc.perform(post(CREATIVE_BASE + "/copy/" + copyId + "/archive")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"));
    }

    @Test
    void testRunGovernanceCheckOnCopy() throws Exception {
        UUID copyId = createCopyArtifactAsAdmin("Gov Copy", "Check me");

        MvcResult result = mockMvc.perform(post(CREATIVE_BASE + "/copy/" + copyId + "/governance-check")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\": \"en\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = readJson(result);
        Assertions.assertTrue(body.hasNonNull("governanceCheckRunId"));
    }

    @Test
    void testCreateVariantSetAndVariants() throws Exception {
        UUID firstCopyId = createCopyArtifactAsAdmin("Parent Copy", "A");
        UUID secondCopyId = createCopyArtifactAsAdmin("Variant Copy", "B");

        MvcResult setResult = mockMvc.perform(post(CREATIVE_BASE + "/variant-sets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Ad Variants",
                                  "parentEntityType": "COPY",
                                  "parentEntityId": "%s",
                                  "strategy": "MANUAL"
                                }
                                """
                                        .formatted(firstCopyId)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID setId = UUID.fromString(readJson(setResult).get("id").asText());

        mockMvc.perform(post(CREATIVE_BASE + "/variant-sets/" + setId + "/variants")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "entityType": "COPY_ARTIFACT",
                                  "entityId": "%s"
                                }
                                """
                                        .formatted(secondCopyId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.variantIndex").value(0));
    }

    @Test
    void testCreateUsageRecord() throws Exception {
        UUID assetId = createAssetAsAdmin();
        UUID usedEntityId = UUID.fromString("20eebc99-9c0b-4ef8-bb6d-6bb9bd380a88");

        mockMvc.perform(post(CREATIVE_BASE + "/usage")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "usedEntityType": "CONVERSATION_CAMPAIGN",
                                  "usedEntityId": "%s",
                                  "creativeEntityType": "ASSET",
                                  "creativeEntityId": "%s",
                                  "relationType": "USES"
                                }
                                """
                                        .formatted(usedEntityId, assetId)))
                .andExpect(status().isCreated());

        mockMvc.perform(get(CREATIVE_BASE + "/usage")
                        .param("creativeEntityType", "ASSET")
                        .param("creativeEntityId", assetId.toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void testAiGenerateCopyVariants() throws Exception {
        MvcResult genResult = mockMvc.perform(post(CREATIVE_BASE + "/ai/copy/generate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "AI Spring Ads",
                                  "copyArtifactType": "AD_COPY",
                                  "language": "en",
                                  "numVariants": 2
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode gen = readJson(genResult);
        Assertions.assertTrue(gen.hasNonNull("variantSetId"));
        Assertions.assertTrue(gen.hasNonNull("runId"));
        JsonNode ids = gen.get("copyArtifactIds");
        Assertions.assertNotNull(ids);
        Assertions.assertTrue(ids.isArray() && ids.size() > 0);

        UUID firstArtifactId = UUID.fromString(ids.get(0).asText());

        MvcResult linksResult = mockMvc.perform(get(CREATIVE_BASE + "/ai/links")
                        .param("producedEntityType", "COPY_ARTIFACT")
                        .param("producedEntityId", firstArtifactId.toString())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode links = readJson(linksResult);
        Assertions.assertTrue(links.isArray() && links.size() > 0);
        boolean found =
                java.util.stream.StreamSupport.stream(links.spliterator(), false)
                        .anyMatch(
                                n ->
                                        "COPY_ARTIFACT".equals(n.get("producedEntityType").asText())
                                                && firstArtifactId.equals(
                                                        UUID.fromString(n.get("producedEntityId").asText())));
        Assertions.assertTrue(found);
    }

    @Test
    void testAiEnrichAssetCreatesProposal() throws Exception {
        UUID assetId = createAssetAsAdmin();

        MvcResult result = mockMvc.perform(post(CREATIVE_BASE + "/ai/assets/" + assetId + "/enrich")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"language\": \"en\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = readJson(result);
        Assertions.assertTrue(body.hasNonNull("proposalId"));
        Assertions.assertTrue(body.hasNonNull("runId"));
    }

    @Test
    void testViewerCannotRunAiEndpoints() throws Exception {
        mockMvc.perform(get(CREATIVE_BASE + "/assets").header("Authorization", "Bearer " + analystToken))
                .andExpect(status().isOk());

        mockMvc.perform(post(CREATIVE_BASE + "/assets")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Analyst Blocked",
                                  "assetType": "IMAGE",
                                  "sourceUrl": "https://example.com/x.png",
                                  "visibility": "WORKSPACE"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post(CREATIVE_BASE + "/ai/copy/generate")
                        .header("Authorization", "Bearer " + analystToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "name": "Analyst AI Copy",
                                  "copyArtifactType": "AD_COPY",
                                  "language": "en",
                                  "numVariants": 1
                                }
                                """))
                .andExpect(status().isCreated());
    }
}
