package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.SnapshotCreateRequest;
import com.avyukt.marketsuite.research.api.dto.SnapshotResponse;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.domain.SnapshotType;
import com.avyukt.marketsuite.research.service.SnapshotService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/snapshots")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class SnapshotsController {

    private final SnapshotService snapshotService;
    private final ObjectMapper objectMapper;

    public SnapshotsController(SnapshotService snapshotService, ObjectMapper objectMapper) {
        this.snapshotService = snapshotService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List source snapshots")
    public ResponseEntity<List<SnapshotResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(
                snapshotService.listByWorkspace(workspaceId).stream().map(this::toSnapshotResponse).toList());
    }

    @GetMapping("/{snapshotId}")
    @Operation(summary = "Get source snapshot")
    public ResponseEntity<SnapshotResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID snapshotId) {
        return ResponseEntity.ok(toSnapshotResponse(snapshotService.get(workspaceId, snapshotId)));
    }

    @PostMapping
    @Operation(summary = "Create source snapshot")
    public ResponseEntity<SnapshotResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody SnapshotCreateRequest request) {
        try {
            String rawJson =
                    request.rawJson() != null ? objectMapper.writeValueAsString(request.rawJson()) : "{}";
            String tagsJson =
                    request.tags() != null ? objectMapper.writeValueAsString(request.tags()) : "[]";
            SourceSnapshot saved =
                    snapshotService.create(
                            workspaceId,
                            request.sourceId(),
                            SnapshotType.valueOf(request.snapshotType()),
                            request.title(),
                            request.summaryText(),
                            request.rawText(),
                            rawJson,
                            request.sentiment(),
                            tagsJson);
            return ResponseEntity.status(HttpStatus.CREATED).body(toSnapshotResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DeleteMapping("/{snapshotId}")
    @Operation(summary = "Delete source snapshot")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID snapshotId) {
        snapshotService.delete(workspaceId, snapshotId);
        return ResponseEntity.noContent().build();
    }

    private SnapshotResponse toSnapshotResponse(SourceSnapshot s) {
        return new SnapshotResponse(
                s.getId(),
                s.getWorkspace().getId(),
                s.getSource().getId(),
                s.getSnapshotType().name(),
                s.getCapturedAt(),
                s.getContentHash(),
                s.getTitle(),
                s.getSummaryText(),
                s.getRawText(),
                parseJsonMap(s.getRawJson()),
                s.getSentiment() != null ? s.getSentiment().name() : null,
                parseJsonList(s.getTags()),
                s.getCreatedByUser().getId(),
                s.getCreatedAt());
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
