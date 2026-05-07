package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.*;
import com.avyukt.marketsuite.research.repo.InsightEvidenceRepository;
import com.avyukt.marketsuite.research.service.InsightService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/insights")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class InsightsController {

    private final InsightService insightService;
    private final InsightEvidenceRepository insightEvidenceRepository;
    private final ObjectMapper objectMapper;

    public InsightsController(
            InsightService insightService,
            InsightEvidenceRepository insightEvidenceRepository,
            ObjectMapper objectMapper) {
        this.insightService = insightService;
        this.insightEvidenceRepository = insightEvidenceRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List insights")
    public ResponseEntity<List<InsightResponse>> list(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) UUID competitorId) {
        List<Insight> items = filterInsights(workspaceId, status, category, competitorId);
        return ResponseEntity.ok(items.stream().map(this::toInsightResponse).toList());
    }

    @GetMapping("/{insightId}")
    @Operation(summary = "Get insight")
    public ResponseEntity<InsightResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID insightId) {
        return ResponseEntity.ok(toInsightResponse(insightService.get(workspaceId, insightId)));
    }

    @PostMapping
    @Operation(summary = "Create insight")
    public ResponseEntity<InsightResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody InsightCreateRequest request) {
        ResearchCategory category;
        InsightType insightType;
        ConfidenceLevel conf;
        try {
            category = ResearchCategory.valueOf(request.category());
        } catch (IllegalArgumentException e) {
            throw new com.avyukt.marketsuite.common.exception.BusinessException(
                    "Invalid category: " + request.category());
        }
        try {
            insightType = InsightType.valueOf(request.insightType());
        } catch (IllegalArgumentException e) {
            throw new com.avyukt.marketsuite.common.exception.BusinessException(
                    "Invalid insightType: " + request.insightType());
        }
        try {
            conf = request.confidence() != null ? ConfidenceLevel.valueOf(request.confidence()) : null;
        } catch (IllegalArgumentException e) {
            throw new com.avyukt.marketsuite.common.exception.BusinessException(
                    "Invalid confidence: " + request.confidence());
        }
        String detailsJson = toJsonString(request.detailsJson());
        String kwJson = toJsonString(request.relatedKeywords());
        String topicsJson = toJsonString(request.relatedTopics());
        Insight saved =
                insightService.create(
                        workspaceId,
                        category,
                        insightType,
                        request.title(),
                        request.summary(),
                        detailsJson,
                        conf,
                        request.competitorId(),
                        kwJson,
                        topicsJson,
                        request.language());
        return ResponseEntity.status(HttpStatus.CREATED).body(toInsightResponse(saved));
    }

    @PatchMapping("/{insightId}")
    @Operation(summary = "Update insight")
    public ResponseEntity<InsightResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID insightId,
            @RequestBody InsightPatchRequest patch) {
        String detailsJson = toJsonString(patch.detailsJson());
        String kwJson = toJsonString(patch.relatedKeywords());
        String topicsJson = toJsonString(patch.relatedTopics());
        Insight saved =
                insightService.update(
                        workspaceId,
                        insightId,
                        patch.title(),
                        patch.summary(),
                        detailsJson,
                        patch.confidence(),
                        kwJson,
                        topicsJson,
                        patch.language(),
                        patch.status());
        return ResponseEntity.ok(toInsightResponse(saved));
    }

    @DeleteMapping("/{insightId}")
    @Operation(summary = "Delete insight")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID insightId) {
        insightService.delete(workspaceId, insightId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{insightId}/publish")
    @Operation(summary = "Publish insight")
    public ResponseEntity<InsightResponse> publish(
            @PathVariable UUID workspaceId, @PathVariable UUID insightId) {
        return ResponseEntity.ok(toInsightResponse(insightService.publish(workspaceId, insightId)));
    }

    @PostMapping("/{insightId}/archive")
    @Operation(summary = "Archive insight")
    public ResponseEntity<InsightResponse> archive(
            @PathVariable UUID workspaceId, @PathVariable UUID insightId) {
        return ResponseEntity.ok(toInsightResponse(insightService.archive(workspaceId, insightId)));
    }

    @GetMapping("/{insightId}/evidence")
    @Operation(summary = "List insight evidence")
    public ResponseEntity<List<EvidenceResponse>> listEvidence(
            @PathVariable UUID workspaceId, @PathVariable UUID insightId) {
        insightService.get(workspaceId, insightId);
        return ResponseEntity.ok(
                insightService.listEvidence(insightId).stream().map(this::toEvidenceResponse).toList());
    }

    @PostMapping("/{insightId}/evidence")
    @Operation(summary = "Add insight evidence")
    public ResponseEntity<EvidenceResponse> addEvidence(
            @PathVariable UUID workspaceId,
            @PathVariable UUID insightId,
            @Valid @RequestBody EvidenceCreateRequest request) {
        String evidenceJson = toJsonString(request.evidenceJson());
        InsightEvidence saved =
                insightService.addEvidence(
                        insightId,
                        request.snapshotId(),
                        request.citationText(),
                        request.citationUrl(),
                        evidenceJson);
        return ResponseEntity.status(HttpStatus.CREATED).body(toEvidenceResponse(saved));
    }

    @DeleteMapping("/{insightId}/evidence/{evidenceId}")
    @Operation(summary = "Remove insight evidence")
    public ResponseEntity<Void> removeEvidence(
            @PathVariable UUID workspaceId,
            @PathVariable UUID insightId,
            @PathVariable UUID evidenceId) {
        insightService.get(workspaceId, insightId);
        insightService.removeEvidence(evidenceId);
        return ResponseEntity.noContent().build();
    }

    private List<Insight> filterInsights(
            UUID workspaceId, String status, String category, UUID competitorId) {
        Stream<Insight> stream = insightService.list(workspaceId).stream();
        if (status != null && !status.isBlank()) {
            InsightStatus st = InsightStatus.valueOf(status);
            stream = stream.filter(i -> i.getStatus() == st);
        }
        if (category != null && !category.isBlank()) {
            ResearchCategory cat = ResearchCategory.valueOf(category);
            stream = stream.filter(i -> i.getCategory() == cat);
        }
        if (competitorId != null) {
            stream =
                    stream.filter(
                            i ->
                                    i.getCompetitor() != null
                                            && competitorId.equals(i.getCompetitor().getId()));
        }
        return stream.toList();
    }

    private InsightResponse toInsightResponse(Insight i) {
        long evidenceCount = insightEvidenceRepository.countByInsightId(i.getId());
        return new InsightResponse(
                i.getId(),
                i.getWorkspace().getId(),
                i.getCategory().name(),
                i.getInsightType().name(),
                i.getTitle(),
                i.getSummary(),
                parseJsonMap(i.getDetailsJson()),
                i.getConfidence().name(),
                i.getStatus().name(),
                i.getCompetitor() != null ? i.getCompetitor().getId() : null,
                parseJsonList(i.getRelatedKeywords()),
                parseJsonList(i.getRelatedTopics()),
                i.getLanguage(),
                i.getCreatedByUser().getId(),
                i.getCreatedAt(),
                i.getUpdatedAt(),
                evidenceCount);
    }

    private EvidenceResponse toEvidenceResponse(InsightEvidence e) {
        return new EvidenceResponse(
                e.getId(),
                e.getInsight().getId(),
                e.getSnapshot().getId(),
                e.getCitationText(),
                e.getCitationUrl(),
                parseJsonMap(e.getEvidenceJson()),
                e.getCreatedAt());
    }

    private String toJsonString(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return null;
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
