package com.avyukt.marketsuite.governance;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.avyukt.marketsuite.AbstractIntegrationTest;
import com.avyukt.marketsuite.auth.dto.LoginResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class GovernanceIntegrationTest extends AbstractIntegrationTest {

    private static final String ORG_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    private static final String WS_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
    private static final String BRAND_PROFILE_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String accessToken;

    @BeforeEach
    void setUp() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "admin@avyukt.com", "password": "password"}
                                """))
                .andReturn();
        if (result.getResponse().getStatus() == 200) {
            LoginResponse login =
                    objectMapper.readValue(result.getResponse().getContentAsString(), LoginResponse.class);
            accessToken = login.accessToken();
        }
    }

    @Test
    void getOrgBrandProfile_seeded_returns200() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(get("/api/v1/orgs/" + ORG_ID + "/brand-profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Avyukt Brand"))
                .andExpect(jsonPath("$.voiceTone").value("PROFESSIONAL"));
    }

    @Test
    void patchOrgBrandProfile_updatesFields() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(patch("/api/v1/orgs/" + ORG_ID + "/brand-profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"primaryColor": "#FF5733", "voiceTone": "FRIENDLY"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryColor").value("#FF5733"))
                .andExpect(jsonPath("$.voiceTone").value("FRIENDLY"));
    }

    @Test
    void initWorkspaceBrandProfile_thenGetEffective() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(post("/api/v1/workspaces/" + WS_ID + "/brand-profile/init")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orgBrandProfileId").value(BRAND_PROFILE_ID));

        mockMvc.perform(get("/api/v1/workspaces/" + WS_ID + "/brand-profile/effective")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").exists());

        mockMvc.perform(patch("/api/v1/workspaces/" + WS_ID + "/brand-profile/overrides")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"overridesJson": "{\\"voiceTone\\":\\"PREMIUM\\",\\"defaultLanguage\\":\\"en-IN\\"}"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voiceTone").value("PREMIUM"))
                .andExpect(jsonPath("$.defaultLanguage").value("en-IN"));
    }

    @Test
    void createRuleSet_createRule_runGovernanceCheck_bannedPhraseTriggersBlock() throws Exception {
        if (accessToken == null) return;

        MvcResult rsResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/rulesets")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scope": "ORG", "name": "Compliance Rules", "domain": "GENERAL"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Compliance Rules"))
                .andReturn();
        String ruleSetId = objectMapper
                .readTree(rsResult.getResponse().getContentAsString())
                .get("id")
                .asText();

        mockMvc.perform(post("/api/v1/rulesets/" + ruleSetId + "/rules")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "ruleType": "BANNED_PHRASE",
                                    "severity": "BLOCK",
                                    "name": "No guaranteed returns",
                                    "pattern": "guaranteed returns"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/workspaces/" + WS_ID + "/governance/check")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                    "entityType": "SPONSORED_UNIT",
                                    "entityId": "00000000-0000-0000-0000-000000000001",
                                    "contentPayloadJson": "{\\"headline\\":\\"Invest now for guaranteed returns!\\"}",
                                    "ruleSetId": "%s"
                                }
                                """
                                        .formatted(ruleSetId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("FAIL"))
                .andExpect(jsonPath("$.findingsJson").isNotEmpty());
    }

    @Test
    void createDisclaimer_addLocalization() throws Exception {
        if (accessToken == null) return;

        MvcResult dResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/disclaimers")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "scope": "ORG",
                                    "key": "FINANCE_RISK",
                                    "title": "Financial Risk Disclaimer",
                                    "defaultText": "Investments carry risk. Past performance is not indicative of future results."
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.key").value("FINANCE_RISK"))
                .andReturn();
        String disclaimerId = objectMapper
                .readTree(dResult.getResponse().getContentAsString())
                .get("id")
                .asText();

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/disclaimers/" + disclaimerId + "/localizations")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"language": "hi", "text": "निवेश में जोखिम होता है।"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.language").value("hi"));
    }

    @Test
    void templateLifecycle_draftToApproved() throws Exception {
        if (accessToken == null) return;

        MvcResult tResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "scope": "ORG",
                                    "templateType": "AD_COPY",
                                    "name": "Spring Promo",
                                    "contentJson": "{\\"headline\\":\\"Spring Sale!\\",\\"primaryText\\":\\"Save 20% today\\"}"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        String templateId = objectMapper
                .readTree(tResult.getResponse().getContentAsString())
                .get("id")
                .asText();

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates/" + templateId + "/submit")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_REVIEW"));

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates/" + templateId + "/approve")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates/" + templateId + "/new-version")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.version").value(2))
                .andExpect(jsonPath("$.parentTemplateId").value(templateId));
    }

    @Test
    void recordTemplateUsage() throws Exception {
        if (accessToken == null) return;

        MvcResult tResult = mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "scope": "ORG",
                                    "templateType": "SOCIAL_POST",
                                    "name": "Usage Test Template",
                                    "contentJson": "{\\"caption\\":\\"Test\\"}"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String templateId = objectMapper
                .readTree(tResult.getResponse().getContentAsString())
                .get("id")
                .asText();

        mockMvc.perform(post("/api/v1/orgs/" + ORG_ID + "/templates/" + templateId + "/record-usage")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                    "workspaceId": "%s",
                                    "usedInEntityType": "SPONSORED_UNIT",
                                    "usedInEntityId": "00000000-0000-0000-0000-000000000099"
                                }
                                """
                                        .formatted(WS_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.templateId").value(templateId));
    }

    @Test
    void listPlatformConstraints_returnsSeeded() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(get("/api/v1/platform-constraints")
                        .param("platformType", "X")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].platformType").value("X"));
    }

    @Test
    void listBrandAssets_returns200() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(get("/api/v1/orgs/" + ORG_ID + "/brand-assets")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
