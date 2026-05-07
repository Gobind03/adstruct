package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResearchListRecentSnapshotsTool implements AiTool {

    private final SourceSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "research.listRecentSnapshots";
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
        OffsetDateTime now = OffsetDateTime.now();
        var snapshots = snapshotRepository.findByWorkspaceIdAndCapturedAtBetween(ctx.workspaceId(), since, now);

        ArrayNode items = objectMapper.createArrayNode();
        int count = 0;
        for (var snap : snapshots) {
            if (count >= limit) break;
            ObjectNode n = objectMapper.createObjectNode();
            n.put("snapshotId", snap.getId().toString());
            n.put("title", snap.getTitle() != null ? snap.getTitle() : "");
            n.put("snapshotType", snap.getSnapshotType().name());
            n.put("capturedAt", snap.getCapturedAt().toString());
            items.add(n);
            count++;
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.set("items", items);
        return result;
    }
}
