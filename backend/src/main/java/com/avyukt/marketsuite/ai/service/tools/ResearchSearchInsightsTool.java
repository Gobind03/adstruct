package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.research.domain.Insight;
import com.avyukt.marketsuite.research.repo.InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResearchSearchInsightsTool implements AiTool {

    private final InsightRepository insightRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "research.searchInsights";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            String q = input != null && input.hasNonNull("q") ? input.get("q").asText() : "";
            int limit = input != null && input.hasNonNull("limit") ? input.get("limit").asInt(20) : 20;
            String qLower = q.isBlank() ? null : q.toLowerCase(Locale.ROOT);

            List<Insight> insights = insightRepository.findByWorkspaceId(ctx.workspaceId());
            if (qLower != null) {
                insights = insights.stream()
                        .filter(i -> matchesQuery(i, qLower))
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
                n.put("summary", insight.getSummary() != null ? insight.getSummary() : "");
                n.put("category", insight.getCategory().name());
                n.put("status", insight.getStatus().name());
                items.add(n);
                count++;
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.set("items", items);
            return result;
        } catch (Exception e) {
            log.warn("research.searchInsights failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }

    private static boolean matchesQuery(Insight i, String qLower) {
        String title = i.getTitle() != null ? i.getTitle().toLowerCase(Locale.ROOT) : "";
        String summary = i.getSummary() != null ? i.getSummary().toLowerCase(Locale.ROOT) : "";
        return title.contains(qLower) || summary.contains(qLower);
    }
}
