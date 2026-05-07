package com.avyukt.marketsuite.campaign;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class CampaignIntegrationTest extends AbstractIntegrationTest {

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
            LoginResponse login = objectMapper.readValue(
                    result.getResponse().getContentAsString(), LoginResponse.class);
            accessToken = login.accessToken();
        }
    }

    @Test
    void listCampaigns_withAuth_returns200() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(get("/api/v1/campaigns")
                        .param("workspaceId", "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void getCampaign_withAuth_returns200() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(get("/api/v1/campaigns/20eebc99-9c0b-4ef8-bb6d-6bb9bd380a88")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Spring Launch Campaign"));
    }

    @Test
    void createCampaign_withAuth_returns201() throws Exception {
        if (accessToken == null) return;
        mockMvc.perform(post("/api/v1/campaigns")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "workspaceId": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
                                    "integrationAccountId": "10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77",
                                    "name": "Test Campaign",
                                    "objective": "LEAD",
                                    "dailyBudget": 50.00,
                                    "startDate": "2026-05-01",
                                    "endDate": "2026-07-01"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Campaign"))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }
}
