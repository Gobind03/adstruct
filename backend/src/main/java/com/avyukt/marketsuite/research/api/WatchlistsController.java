package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.RefreshFrequency;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import com.avyukt.marketsuite.research.domain.Watchlist;
import com.avyukt.marketsuite.research.domain.WatchlistType;
import com.avyukt.marketsuite.research.service.WatchlistService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/watchlists")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class WatchlistsController {

    private final WatchlistService watchlistService;
    private final ObjectMapper objectMapper;

    public WatchlistsController(WatchlistService watchlistService, ObjectMapper objectMapper) {
        this.watchlistService = watchlistService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List watchlists")
    public ResponseEntity<List<WatchlistResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(watchlistService.list(workspaceId).stream().map(this::toWatchlistResponse).toList());
    }

    @GetMapping("/{watchlistId}")
    @Operation(summary = "Get watchlist")
    public ResponseEntity<WatchlistResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID watchlistId) {
        return ResponseEntity.ok(toWatchlistResponse(watchlistService.get(workspaceId, watchlistId)));
    }

    @PostMapping
    @Operation(summary = "Create watchlist")
    public ResponseEntity<WatchlistResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody WatchlistCreateRequest request) {
        try {
            String queryJson =
                    request.queryJson() != null ? objectMapper.writeValueAsString(request.queryJson()) : null;
            RefreshFrequency frequency =
                    request.frequency() != null && !request.frequency().isBlank()
                            ? RefreshFrequency.valueOf(request.frequency())
                            : RefreshFrequency.MANUAL;
            Watchlist saved =
                    watchlistService.create(
                            workspaceId,
                            WatchlistType.valueOf(request.watchlistType()),
                            request.name(),
                            request.competitorId(),
                            queryJson,
                            frequency);
            return ResponseEntity.status(HttpStatus.CREATED).body(toWatchlistResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @PatchMapping("/{watchlistId}")
    @Operation(summary = "Update watchlist")
    public ResponseEntity<WatchlistResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID watchlistId,
            @RequestBody WatchlistPatchRequest patch) {
        Watchlist saved =
                watchlistService.update(
                        workspaceId,
                        watchlistId,
                        patch.name(),
                        patch.queryJson() != null ? toQueryJson(patch.queryJson()) : null,
                        patch.frequency(),
                        patch.enabled());
        return ResponseEntity.ok(toWatchlistResponse(saved));
    }

    @DeleteMapping("/{watchlistId}")
    @Operation(summary = "Delete watchlist")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID watchlistId) {
        watchlistService.delete(workspaceId, watchlistId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{watchlistId}/refresh")
    @Operation(summary = "Refresh watchlist")
    public ResponseEntity<JobResponse> refresh(
            @PathVariable UUID workspaceId, @PathVariable UUID watchlistId) {
        ResearchJob job = watchlistService.refresh(workspaceId, watchlistId);
        return ResponseEntity.status(HttpStatus.CREATED).body(toJobResponse(job));
    }

    private String toQueryJson(Map<String, Object> queryJson) {
        try {
            return objectMapper.writeValueAsString(queryJson);
        } catch (Exception e) {
            return "{}";
        }
    }

    private WatchlistResponse toWatchlistResponse(Watchlist w) {
        return new WatchlistResponse(
                w.getId(),
                w.getWorkspace().getId(),
                w.getWatchlistType().name(),
                w.getName(),
                w.getCompetitor() != null ? w.getCompetitor().getId() : null,
                parseJsonMap(w.getQueryJson()),
                w.getFrequency().name(),
                w.isEnabled(),
                w.getLastRefreshedAt(),
                w.getCreatedByUser().getId(),
                w.getCreatedAt(),
                w.getUpdatedAt());
    }

    private JobResponse toJobResponse(ResearchJob j) {
        return new JobResponse(
                j.getId(),
                j.getWorkspace().getId(),
                j.getJobType().name(),
                j.getStatus().name(),
                j.getRequestedByUser().getId(),
                parseJsonMap(j.getInputJson()),
                j.getStartedAt(),
                j.getFinishedAt(),
                j.getStatsJson() != null ? parseJsonMap(j.getStatsJson()) : Map.of(),
                j.getErrorMessage(),
                j.getCreatedAt(),
                j.getUpdatedAt());
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
