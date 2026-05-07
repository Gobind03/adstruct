package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.ResearchSource;
import com.avyukt.marketsuite.research.domain.SourceType;
import com.avyukt.marketsuite.research.service.ResearchSourceService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/sources")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class SourcesController {

    private final ResearchSourceService researchSourceService;
    private final ObjectMapper objectMapper;

    public SourcesController(ResearchSourceService researchSourceService, ObjectMapper objectMapper) {
        this.researchSourceService = researchSourceService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List research sources")
    public ResponseEntity<List<SourceResponse>> list(
            @PathVariable UUID workspaceId, @RequestParam(required = false) String sourceType) {
        List<ResearchSource> items =
                sourceType == null || sourceType.isBlank()
                        ? researchSourceService.list(workspaceId)
                        : researchSourceService.listByType(workspaceId, SourceType.valueOf(sourceType));
        return ResponseEntity.ok(items.stream().map(this::toSourceResponse).toList());
    }

    @GetMapping("/{sourceId}")
    @Operation(summary = "Get research source")
    public ResponseEntity<SourceResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID sourceId) {
        return ResponseEntity.ok(toSourceResponse(researchSourceService.get(workspaceId, sourceId)));
    }

    @PostMapping
    @Operation(summary = "Create research source")
    public ResponseEntity<SourceResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody SourceCreateRequest request) {
        try {
            String metaJson =
                    request.metaJson() != null ? objectMapper.writeValueAsString(request.metaJson()) : null;
            ResearchSource saved =
                    researchSourceService.create(
                            workspaceId,
                            SourceType.valueOf(request.sourceType()),
                            request.title(),
                            request.url(),
                            request.competitorId(),
                            request.integrationAccountId(),
                            request.integrationResourceId(),
                            request.fileUrl(),
                            request.noteText(),
                            metaJson);
            return ResponseEntity.status(HttpStatus.CREATED).body(toSourceResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @PatchMapping("/{sourceId}")
    @Operation(summary = "Update research source")
    public ResponseEntity<SourceResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID sourceId,
            @RequestBody SourcePatchRequest patch) {
        try {
            ResearchSource existing = researchSourceService.get(workspaceId, sourceId);
            String metaJson =
                    patch.metaJson() != null
                            ? objectMapper.writeValueAsString(patch.metaJson())
                            : existing.getMetaJson();
            ResearchSource saved =
                    researchSourceService.update(
                            workspaceId,
                            sourceId,
                            patch.title() != null ? patch.title() : existing.getTitle(),
                            patch.url() != null ? patch.url() : existing.getUrl(),
                            patch.competitorId() != null
                                    ? patch.competitorId()
                                    : (existing.getCompetitor() != null
                                            ? existing.getCompetitor().getId()
                                            : null),
                            patch.noteText() != null ? patch.noteText() : existing.getNoteText(),
                            metaJson);
            return ResponseEntity.ok(toSourceResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DeleteMapping("/{sourceId}")
    @Operation(summary = "Delete research source")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID sourceId) {
        researchSourceService.delete(workspaceId, sourceId);
        return ResponseEntity.noContent().build();
    }

    private SourceResponse toSourceResponse(ResearchSource s) {
        return new SourceResponse(
                s.getId(),
                s.getWorkspace().getId(),
                s.getSourceType().name(),
                s.getTitle(),
                s.getUrl(),
                s.getCompetitor() != null ? s.getCompetitor().getId() : null,
                s.getIntegrationAccount() != null ? s.getIntegrationAccount().getId() : null,
                s.getIntegrationResource() != null ? s.getIntegrationResource().getId() : null,
                s.getFileUrl(),
                s.getNoteText(),
                parseJsonMap(s.getMetaJson()),
                s.getCreatedByUser().getId(),
                s.getCreatedAt(),
                s.getUpdatedAt());
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
