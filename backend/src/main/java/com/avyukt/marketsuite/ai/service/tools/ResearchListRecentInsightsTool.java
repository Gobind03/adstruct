package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.research.domain.Insight;
import com.avyukt.marketsuite.research.domain.InsightStatus;
import com.avyukt.marketsuite.research.repo.InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResearchListRecentInsightsTool implements AiTool {

    private final InsightRepository insightRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "research.listRecentInsights";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        int days = input != null && input.hasNonNull("days") ? input.get("days").asInt(7) : 7;
        int limit = input != null && input.hasNonNull("limit") ? input.get("limit").asInt(20) : 20;
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);

        InsightStatus statusFilter = null;
        if (input != null && input.hasNonNull("status")) {
            try {
                statusFilter = InsightStatus.valueOf(input.get("status").asText().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.debug("Ignoring invalid insight status: {}", input.get("status").asText());
            }
        }

        List<Insight> insights;
        if (statusFilter != null) {
            insights = new ArrayList<>(
                    insightRepository.findByWorkspaceIdAndStatusAndCreatedAtAfter(
                            ctx.workspaceId(), statusFilter, since));
        } else {
            insights = insightRepository.findByWorkspaceId(ctx.workspaceId()).stream()
                    .filter(i -> i.getCreatedAt() != null && i.getCreatedAt().isAfter(since))
                    .collect(Collectors.toList());
        }

        insights.sort(Comparator.comparing(Insight::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed());

        ArrayNode items = objectMapper.createArrayNode();
        int count = 0;
        for (Insight insight : insights) {
            if (count >= limit) break;
            ObjectNode n = objectMapper.createObjectNode();
            n.put("insightId", insight.getId().toString());
            n.put("title", insight.getTitle() != null ? insight.getTitle() : "");
            n.put("category", insight.getCategory().name());
            n.put("status", insight.getStatus().name());
            n.put("insightType", insight.getInsightType().name());
            items.add(n);
            count++;
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.set("items", items);
        return result;
    }
}
