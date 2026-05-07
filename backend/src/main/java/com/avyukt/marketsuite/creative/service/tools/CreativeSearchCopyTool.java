package com.avyukt.marketsuite.creative.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.creative.domain.CopyArtifactType;
import com.avyukt.marketsuite.creative.domain.CopyStatus;
import com.avyukt.marketsuite.creative.domain.CreativeCopyArtifact;
import com.avyukt.marketsuite.creative.repo.CreativeCopyArtifactRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

@Component
public class CreativeSearchCopyTool implements AiTool {

    private static final int CONTENT_PREVIEW_MAX = 200;

    private final CreativeCopyArtifactRepository creativeCopyArtifactRepository;
    private final ObjectMapper objectMapper;

    public CreativeSearchCopyTool(
            CreativeCopyArtifactRepository creativeCopyArtifactRepository, ObjectMapper objectMapper) {
        this.creativeCopyArtifactRepository = creativeCopyArtifactRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "creative.searchCopyArtifacts";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.isObject()) {
                return invalidInput();
            }

            UUID workspaceId = ctx.workspaceId();
            String q = input.hasNonNull("q") ? input.get("q").asText().trim() : "";
            int limit = input.hasNonNull("limit") ? input.get("limit").asInt(20) : 20;
            if (limit < 0) {
                return invalidInput();
            }

            final CopyArtifactType typeFilter;
            if (input.hasNonNull("type")) {
                try {
                    typeFilter = CopyArtifactType.valueOf(input.get("type").asText().trim());
                } catch (IllegalArgumentException ex) {
                    return invalidInput();
                }
            } else {
                typeFilter = null;
            }

            final CopyStatus statusFilter;
            if (input.hasNonNull("status")) {
                try {
                    statusFilter = CopyStatus.valueOf(input.get("status").asText().trim());
                } catch (IllegalArgumentException ex) {
                    return invalidInput();
                }
            } else {
                statusFilter = null;
            }

            List<CreativeCopyArtifact> rows = new ArrayList<>();
            if (!q.isEmpty()) {
                rows = new ArrayList<>(
                        creativeCopyArtifactRepository.findByWorkspaceIdAndNameContainingIgnoreCase(
                                workspaceId, q));
                if (typeFilter != null) {
                    rows = rows.stream().filter(r -> r.getType() == typeFilter).toList();
                }
                if (statusFilter != null) {
                    rows = rows.stream().filter(r -> r.getStatus() == statusFilter).toList();
                }
                if (rows.size() > limit) {
                    rows = rows.subList(0, limit);
                }
            } else if (typeFilter != null && statusFilter != null) {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeCopyArtifact> page =
                        creativeCopyArtifactRepository.findByWorkspaceIdAndTypeAndStatus(
                                workspaceId, typeFilter, statusFilter, pageable);
                rows = page.getContent();
            } else if (typeFilter != null) {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeCopyArtifact> page =
                        creativeCopyArtifactRepository.findByWorkspaceIdAndType(
                                workspaceId, typeFilter, pageable);
                rows = page.getContent();
            } else if (statusFilter != null) {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeCopyArtifact> page =
                        creativeCopyArtifactRepository.findByWorkspaceIdAndStatus(
                                workspaceId, statusFilter, pageable);
                rows = page.getContent();
            } else {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeCopyArtifact> page =
                        creativeCopyArtifactRepository.findByWorkspaceId(workspaceId, pageable);
                rows = page.getContent();
            }

            ArrayNode items = objectMapper.createArrayNode();
            for (CreativeCopyArtifact c : rows) {
                ObjectNode row = objectMapper.createObjectNode();
                row.put("id", c.getId().toString());
                row.put("name", c.getName() != null ? c.getName() : "");
                row.put("type", c.getType() != null ? c.getType().name() : "");
                row.put("status", c.getStatus() != null ? c.getStatus().name() : "");
                row.put("language", c.getLanguage() != null ? c.getLanguage() : "");
                row.put("contentText", truncate(c.getContentText(), CONTENT_PREVIEW_MAX));
                items.add(row);
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.set("items", items);
            return result;
        } catch (Exception e) {
            return invalidInput();
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    private ObjectNode invalidInput() {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", "Invalid input");
        return err;
    }
}
