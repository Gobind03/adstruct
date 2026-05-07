package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.KeywordCluster;
import com.avyukt.marketsuite.research.service.KeywordClusterService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/keyword-clusters")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class KeywordClustersController {

    private final KeywordClusterService keywordClusterService;
    private final ObjectMapper objectMapper;

    public KeywordClustersController(KeywordClusterService keywordClusterService, ObjectMapper objectMapper) {
        this.keywordClusterService = keywordClusterService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List keyword clusters")
    public ResponseEntity<List<KeywordClusterResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(
                keywordClusterService.list(workspaceId).stream().map(this::toKeywordClusterResponse).toList());
    }

    @GetMapping("/{clusterId}")
    @Operation(summary = "Get keyword cluster")
    public ResponseEntity<KeywordClusterResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID clusterId) {
        return ResponseEntity.ok(toKeywordClusterResponse(keywordClusterService.get(workspaceId, clusterId)));
    }

    @PostMapping
    @Operation(summary = "Create keyword cluster")
    public ResponseEntity<KeywordClusterResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody KeywordClusterCreateRequest request) {
        String keywordsJson = toJsonString(request.keywords(), "[]");
        String metricsJson = toJsonString(request.metricsJson(), null);
        KeywordCluster saved =
                keywordClusterService.create(
                        workspaceId,
                        request.name(),
                        request.intentType(),
                        keywordsJson,
                        metricsJson,
                        request.sourceSnapshotId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toKeywordClusterResponse(saved));
    }

    @PatchMapping("/{clusterId}")
    @Operation(summary = "Update keyword cluster")
    public ResponseEntity<KeywordClusterResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID clusterId,
            @RequestBody KeywordClusterPatchRequest patch) {
        String keywordsJson =
                patch.keywords() != null ? toJsonString(patch.keywords(), null) : null;
        String metricsJson =
                patch.metricsJson() != null ? toJsonString(patch.metricsJson(), null) : null;
        KeywordCluster saved =
                keywordClusterService.update(
                        workspaceId, clusterId, patch.name(), patch.intentType(), keywordsJson, metricsJson);
        return ResponseEntity.ok(toKeywordClusterResponse(saved));
    }

    @DeleteMapping("/{clusterId}")
    @Operation(summary = "Delete keyword cluster")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID clusterId) {
        keywordClusterService.delete(workspaceId, clusterId);
        return ResponseEntity.noContent().build();
    }

    private KeywordClusterResponse toKeywordClusterResponse(KeywordCluster k) {
        return new KeywordClusterResponse(
                k.getId(),
                k.getWorkspace().getId(),
                k.getName(),
                k.getIntentType(),
                parseJsonList(k.getKeywords()),
                parseJsonMap(k.getMetricsJson()),
                k.getSourceSnapshot() != null ? k.getSourceSnapshot().getId() : null,
                k.getCreatedByUser().getId(),
                k.getCreatedAt(),
                k.getUpdatedAt());
    }

    private String toJsonString(Object obj, String fallback) {
        if (obj == null) return fallback;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return fallback;
        }
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
