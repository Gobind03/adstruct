package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.JobResponse;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import com.avyukt.marketsuite.research.service.ResearchJobService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/jobs")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class JobsController {

    private final ResearchJobService researchJobService;
    private final ObjectMapper objectMapper;

    public JobsController(ResearchJobService researchJobService, ObjectMapper objectMapper) {
        this.researchJobService = researchJobService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List research jobs")
    public ResponseEntity<List<JobResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(researchJobService.list(workspaceId).stream().map(this::toJobResponse).toList());
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Get research job")
    public ResponseEntity<JobResponse> get(@PathVariable UUID workspaceId, @PathVariable UUID jobId) {
        return ResponseEntity.ok(toJobResponse(researchJobService.get(workspaceId, jobId)));
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
