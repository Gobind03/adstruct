package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.DigestReportResponse;
import com.avyukt.marketsuite.research.domain.ResearchDigestReport;
import com.avyukt.marketsuite.research.service.ResearchDigestReportService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/digests")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class DigestsController {

    private final ResearchDigestReportService digestReportService;
    private final ObjectMapper objectMapper;

    public DigestsController(ResearchDigestReportService digestReportService, ObjectMapper objectMapper) {
        this.digestReportService = digestReportService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List digest reports")
    public ResponseEntity<List<DigestReportResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(
                digestReportService.list(workspaceId).stream().map(this::toDigestReportResponse).toList());
    }

    @GetMapping("/{digestId}")
    @Operation(summary = "Get digest report")
    public ResponseEntity<DigestReportResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID digestId) {
        return ResponseEntity.ok(toDigestReportResponse(digestReportService.get(workspaceId, digestId)));
    }

    private DigestReportResponse toDigestReportResponse(ResearchDigestReport r) {
        return new DigestReportResponse(
                r.getId(),
                r.getWorkspace().getId(),
                r.getTitle(),
                r.getPeriodStart(),
                r.getPeriodEnd(),
                r.getContentText(),
                parseJsonMap(r.getContentJson()),
                r.getAiPromptRun() != null ? r.getAiPromptRun().getId() : null,
                r.getCreatedByUser().getId(),
                r.getCreatedAt());
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
