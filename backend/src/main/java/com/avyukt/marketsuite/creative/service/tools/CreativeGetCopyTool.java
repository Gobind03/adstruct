package com.avyukt.marketsuite.creative.service.tools;

import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.service.tools.AiTool;
import com.avyukt.marketsuite.ai.service.tools.AiToolContext;
import com.avyukt.marketsuite.creative.domain.CreativeCopyArtifact;
import com.avyukt.marketsuite.creative.repo.CreativeCopyArtifactRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CreativeGetCopyTool implements AiTool {

    private final CreativeCopyArtifactRepository creativeCopyArtifactRepository;
    private final ObjectMapper objectMapper;

    public CreativeGetCopyTool(
            CreativeCopyArtifactRepository creativeCopyArtifactRepository, ObjectMapper objectMapper) {
        this.creativeCopyArtifactRepository = creativeCopyArtifactRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "creative.getCopyArtifact";
    }

    @Override
    public ToolRiskLevel riskLevel() {
        return ToolRiskLevel.READ_ONLY;
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode execute(AiToolContext ctx, JsonNode input) {
        try {
            if (input == null || !input.hasNonNull("copyArtifactId")) {
                return invalidInput();
            }
            UUID copyArtifactId;
            try {
                copyArtifactId = UUID.fromString(input.get("copyArtifactId").asText().trim());
            } catch (IllegalArgumentException ex) {
                return invalidInput();
            }

            CreativeCopyArtifact artifact =
                    creativeCopyArtifactRepository.findById(copyArtifactId).orElse(null);
            if (artifact == null) {
                return notFound();
            }
            if (artifact.getWorkspace() == null
                    || !ctx.workspaceId().equals(artifact.getWorkspace().getId())) {
                return notFound();
            }

            ObjectNode result = objectMapper.createObjectNode();
            result.put("id", artifact.getId().toString());
            result.put("name", artifact.getName() != null ? artifact.getName() : "");
            result.put("type", artifact.getType() != null ? artifact.getType().name() : "");
            result.put("status", artifact.getStatus() != null ? artifact.getStatus().name() : "");
            result.put("language", artifact.getLanguage() != null ? artifact.getLanguage() : "");
            result.put("contentText", artifact.getContentText() != null ? artifact.getContentText() : "");
            result.set("contentJson", parseJsonOrEmpty(artifact.getContentJson()));
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
