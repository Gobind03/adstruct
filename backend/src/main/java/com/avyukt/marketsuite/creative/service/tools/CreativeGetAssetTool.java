package com.avyukt.marketsuite.creative.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.creative.domain.CreativeAsset;
import com.avyukt.marketsuite.creative.repo.CreativeAssetRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CreativeGetAssetTool implements AiTool {

    private final CreativeAssetRepository creativeAssetRepository;
    private final ObjectMapper objectMapper;

    public CreativeGetAssetTool(CreativeAssetRepository creativeAssetRepository, ObjectMapper objectMapper) {
        this.creativeAssetRepository = creativeAssetRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "creative.getAsset";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.hasNonNull("assetId")) {
                return invalidInput();
            }
            UUID assetId;
            try {
                assetId = UUID.fromString(input.get("assetId").asText().trim());
            } catch (IllegalArgumentException ex) {
                return invalidInput();
            }

            CreativeAsset asset = creativeAssetRepository.findById(assetId).orElse(null);
            if (asset == null) {
                return notFound();
            }
            if (asset.getWorkspace() == null || !ctx.workspaceId().equals(asset.getWorkspace().getId())) {
                return notFound();
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.put("id", asset.getId().toString());
            result.put("name", asset.getName() != null ? asset.getName() : "");
            result.put("assetType", asset.getAssetType() != null ? asset.getAssetType().name() : "");
            result.put("status", asset.getStatus() != null ? asset.getStatus().name() : "");
            result.put("fileUrl", asset.getFileUrl() != null ? asset.getFileUrl() : "");
            result.put("sourceUrl", asset.getSourceUrl() != null ? asset.getSourceUrl() : "");
            result.put("description", asset.getDescription() != null ? asset.getDescription() : "");
            result.set("tags", parseJsonOrEmpty(asset.getTags()));
            result.set("metaJson", parseJsonOrEmpty(asset.getMetaJson()));
            result.put("mimeType", asset.getMimeType() != null ? asset.getMimeType() : "");
            return result;
        } catch (Exception e) {
            return invalidInput();
        }
    }

    private JsonNode parseJsonOrEmpty(String raw) {
        if (raw == null || raw.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            ObjectNode n = objectMapper.createObjectNode();
            n.put("raw", raw);
            return n;
        }
    }

    private ObjectNode notFound() {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", "Not found");
        return err;
    }

    private ObjectNode invalidInput() {
        ObjectNode err = objectMapper.createObjectNode();
        err.put("error", "Invalid input");
        return err;
    }
}
