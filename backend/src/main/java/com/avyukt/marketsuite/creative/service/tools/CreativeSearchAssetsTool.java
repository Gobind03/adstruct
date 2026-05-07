package com.avyukt.marketsuite.creative.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.creative.domain.AssetType;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import com.avyukt.marketsuite.creative.repo.CreativeAssetRepository;
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
public class CreativeSearchAssetsTool implements AiTool {

    private final CreativeAssetRepository creativeAssetRepository;
    private final ObjectMapper objectMapper;

    public CreativeSearchAssetsTool(
            CreativeAssetRepository creativeAssetRepository, ObjectMapper objectMapper) {
        this.creativeAssetRepository = creativeAssetRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "creative.searchAssets";
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

            final AssetType assetTypeFilter;
            if (input.hasNonNull("type")) {
                try {
                    assetTypeFilter = AssetType.valueOf(input.get("type").asText().trim());
                } catch (IllegalArgumentException ex) {
                    return invalidInput();
                }
            } else {
                assetTypeFilter = null;
            }

            List<CreativeAsset> assets = new ArrayList<>();
            if (!q.isEmpty()) {
                assets = new ArrayList<>(
                        creativeAssetRepository.findByWorkspaceIdAndNameContainingIgnoreCase(
                                workspaceId, q));
                if (assetTypeFilter != null) {
                    assets = assets.stream()
                            .filter(a -> a.getAssetType() == assetTypeFilter)
                            .toList();
                }
                if (assets.size() > limit) {
                    assets = assets.subList(0, limit);
                }
            } else if (assetTypeFilter != null) {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeAsset> page =
                        creativeAssetRepository.findByWorkspaceIdAndAssetType(
                                workspaceId, assetTypeFilter, pageable);
                assets = page.getContent();
            } else {
                Pageable pageable = PageRequest.of(0, limit);
                Page<CreativeAsset> page =
                        creativeAssetRepository.findByWorkspaceId(workspaceId, pageable);
                assets = page.getContent();
            }

            ArrayNode items = objectMapper.createArrayNode();
            for (CreativeAsset a : assets) {
                ObjectNode row = objectMapper.createObjectNode();
                row.put("id", a.getId().toString());
                row.put("name", a.getName() != null ? a.getName() : "");
                row.put("assetType", a.getAssetType() != null ? a.getAssetType().name() : "");
                row.put("fileUrl", a.getFileUrl() != null ? a.getFileUrl() : "");
                row.put("status", a.getStatus() != null ? a.getStatus().name() : "");
                items.add(row);
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.set("items", items);
            return result;
        } catch (Exception e) {
            return invalidInput();
        }
    }

    private ObjectNode invalidInput() {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", "Invalid input");
        return err;
    }
}
