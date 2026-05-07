package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.research.domain.Competitor;
import com.avyukt.marketsuite.research.repo.CompetitorRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResearchGetCompetitorTool implements AiTool {

    private final CompetitorRepository competitorRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "research.getCompetitor";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.hasNonNull("competitorId")) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "competitorId is required");
                return err;
            }
            UUID competitorId;
            try {
                competitorId = UUID.fromString(input.get("competitorId").asText().trim());
            } catch (Exception ex) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "competitorId must be a valid UUID");
                return err;
            }

            Competitor competitor = competitorRepository.findById(competitorId).orElse(null);
            if (competitor == null) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "competitor not found");
                return err;
            }
            if (competitor.getWorkspace() == null || !ctx.workspaceId().equals(competitor.getWorkspace().getId())) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "competitor does not belong to the current workspace");
                return err;
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.put("competitorId", competitor.getId().toString());
            result.put("name", competitor.getName() != null ? competitor.getName() : "");
            result.put("websiteUrl", competitor.getWebsiteUrl() != null ? competitor.getWebsiteUrl() : "");
            result.put("status", competitor.getStatus().name());
            result.put("description", competitor.getDescription() != null ? competitor.getDescription() : "");
            return result;
        } catch (Exception e) {
            log.warn("research.getCompetitor failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }
}
