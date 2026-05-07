package com.avyukt.marketsuite.ai.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
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
public class ResearchGetSnapshotTool implements AiTool {

    private static final int RAW_TEXT_MAX = 5000;

    private final SourceSnapshotRepository snapshotRepository;
    private final ObjectMapper objectMapper;

    @Override
    public String name() {
        return "research.getSnapshot";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.hasNonNull("snapshotId")) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "snapshotId is required");
                return err;
            }
            UUID snapshotId;
            try {
                snapshotId = UUID.fromString(input.get("snapshotId").asText().trim());
            } catch (Exception ex) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "snapshotId must be a valid UUID");
                return err;
            }

            SourceSnapshot snap = snapshotRepository.findById(snapshotId).orElse(null);
            if (snap == null) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "snapshot not found");
                return err;
            }
            if (snap.getWorkspace() == null || !ctx.workspaceId().equals(snap.getWorkspace().getId())) {
                ObjectNode err = objectMapper.createObjectNode();
                err.put("error", "snapshot does not belong to the current workspace");
                return err;
            }

            String raw = snap.getRawText();
            if (raw != null && raw.length() > RAW_TEXT_MAX) {
                raw = raw.substring(0, RAW_TEXT_MAX);
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.put("snapshotId", snap.getId().toString());
            result.put("title", snap.getTitle() != null ? snap.getTitle() : "");
            result.put("rawText", raw != null ? raw : "");
            result.put("summaryText", snap.getSummaryText() != null ? snap.getSummaryText() : "");
            result.put("snapshotType", snap.getSnapshotType().name());
            return result;
        } catch (Exception e) {
            log.warn("research.getSnapshot failed: {}", e.getMessage(), e);
            ObjectNode err = objectMapper.createObjectNode();
            err.put("error", e.getMessage() != null ? e.getMessage() : "unknown error");
            return err;
        }
    }
}
