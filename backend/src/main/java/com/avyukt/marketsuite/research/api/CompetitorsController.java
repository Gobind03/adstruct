package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.Competitor;
import com.avyukt.marketsuite.research.domain.CompetitorExternalHandle;
import com.avyukt.marketsuite.research.domain.CompetitorStatus;
import com.avyukt.marketsuite.research.service.CompetitorService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/competitors")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class CompetitorsController {

    private final CompetitorService competitorService;
    private final ObjectMapper objectMapper;

    public CompetitorsController(CompetitorService competitorService, ObjectMapper objectMapper) {
        this.competitorService = competitorService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List competitors")
    public ResponseEntity<List<CompetitorResponse>> list(
            @PathVariable UUID workspaceId, @RequestParam(required = false) String status) {
        List<Competitor> items =
                status == null || status.isBlank()
                        ? competitorService.list(workspaceId)
                        : competitorService.listByStatus(workspaceId, CompetitorStatus.valueOf(status));
        return ResponseEntity.ok(items.stream().map(this::toCompetitorResponse).toList());
    }

    @GetMapping("/{competitorId}")
    @Operation(summary = "Get competitor")
    public ResponseEntity<CompetitorResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID competitorId) {
        return ResponseEntity.ok(toCompetitorResponse(competitorService.get(workspaceId, competitorId)));
    }

    @PostMapping
    @Operation(summary = "Create competitor")
    public ResponseEntity<CompetitorResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody CompetitorCreateRequest request) {
        try {
            String categoryJson =
                    objectMapper.writeValueAsString(request.categoryTags() != null ? request.categoryTags() : List.of());
            Competitor saved =
                    competitorService.create(workspaceId, request.name(), request.websiteUrl(), request.description(), categoryJson);
            return ResponseEntity.status(HttpStatus.CREATED).body(toCompetitorResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @PatchMapping("/{competitorId}")
    @Operation(summary = "Update competitor")
    public ResponseEntity<CompetitorResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID competitorId,
            @RequestBody CompetitorPatchRequest patch) {
        try {
            Competitor existing = competitorService.get(workspaceId, competitorId);
            String categoryJson =
                    patch.categoryTags() != null
                            ? objectMapper.writeValueAsString(patch.categoryTags())
                            : existing.getCategoryTags();
            Competitor saved =
                    competitorService.update(
                            workspaceId,
                            competitorId,
                            patch.name() != null ? patch.name() : existing.getName(),
                            patch.websiteUrl() != null ? patch.websiteUrl() : existing.getWebsiteUrl(),
                            patch.description() != null ? patch.description() : existing.getDescription(),
                            categoryJson,
                            patch.status());
            return ResponseEntity.ok(toCompetitorResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DeleteMapping("/{competitorId}")
    @Operation(summary = "Delete competitor")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID competitorId) {
        competitorService.delete(workspaceId, competitorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{competitorId}/handles")
    @Operation(summary = "List competitor handles")
    public ResponseEntity<List<HandleResponse>> listHandles(
            @PathVariable UUID workspaceId, @PathVariable UUID competitorId) {
        competitorService.get(workspaceId, competitorId);
        return ResponseEntity.ok(
                competitorService.listHandles(competitorId).stream().map(this::toHandleResponse).toList());
    }

    @PostMapping("/{competitorId}/handles")
    @Operation(summary = "Add competitor handle")
    public ResponseEntity<HandleResponse> addHandle(
            @PathVariable UUID workspaceId,
            @PathVariable UUID competitorId,
            @Valid @RequestBody HandleCreateRequest request) {
        competitorService.get(workspaceId, competitorId);
        CompetitorExternalHandle saved =
                competitorService.addHandle(
                        competitorId, request.platformType(), request.handle(), request.url());
        return ResponseEntity.status(HttpStatus.CREATED).body(toHandleResponse(saved));
    }

    @DeleteMapping("/{competitorId}/handles/{handleId}")
    @Operation(summary = "Remove competitor handle")
    public ResponseEntity<Void> removeHandle(
            @PathVariable UUID workspaceId,
            @PathVariable UUID competitorId,
            @PathVariable UUID handleId) {
        competitorService.get(workspaceId, competitorId);
        competitorService.removeHandle(handleId);
        return ResponseEntity.noContent().build();
    }

    private CompetitorResponse toCompetitorResponse(Competitor c) {
        return new CompetitorResponse(
                c.getId(),
                c.getWorkspace().getId(),
                c.getName(),
                c.getWebsiteUrl(),
                c.getDescription(),
                parseJsonList(c.getCategoryTags()),
                c.getStatus().name(),
                c.getCreatedByUser().getId(),
                c.getCreatedAt(),
                c.getUpdatedAt());
    }

    private HandleResponse toHandleResponse(CompetitorExternalHandle h) {
        return new HandleResponse(
                h.getId(),
                h.getCompetitor().getId(),
                h.getPlatformType(),
                h.getHandle(),
                h.getUrl(),
                h.getCreatedAt());
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

}
