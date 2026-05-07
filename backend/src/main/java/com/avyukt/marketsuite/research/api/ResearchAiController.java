package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.ProducedEntityType;
import com.avyukt.marketsuite.research.domain.ResearchAiRunLink;
import com.avyukt.marketsuite.research.service.ResearchAiService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/ai")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class ResearchAiController {

    private final ResearchAiService researchAiService;
    private final ObjectMapper objectMapper;

    public ResearchAiController(ResearchAiService researchAiService, ObjectMapper objectMapper) {
        this.researchAiService = researchAiService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/snapshots/{snapshotId}/summarize")
    @Operation(summary = "Summarize snapshot with AI")
    public ResponseEntity<SummarizeResponse> summarize(
            @PathVariable UUID workspaceId,
            @PathVariable UUID snapshotId,
            @Valid @RequestBody SummarizeRequest request) {
        ResearchAiService.SummarizeResult result =
                researchAiService.summarizeSnapshot(
                        workspaceId,
                        snapshotId,
                        request.language(),
                        request.providerOverride(),
                        request.modelOverride());
        return ResponseEntity.ok(
                new SummarizeResponse(
                        result.snapshotId(),
                        result.summary(),
                        result.keyPoints(),
                        result.entities(),
                        result.sentiment(),
                        result.runId(),
                        result.aiLinkId()));
    }

    @PostMapping("/competitors/{competitorId}/extract")
    @Operation(summary = "Extract competitor insights with AI")
    public ResponseEntity<ExtractResponse> extract(
            @PathVariable UUID workspaceId,
            @PathVariable UUID competitorId,
            @Valid @RequestBody ExtractRequest request) {
        ResearchAiService.ExtractResult result =
                researchAiService.extractCompetitorInsights(
                        workspaceId,
                        competitorId,
                        request.snapshotIds(),
                        request.insightTypes(),
                        request.language());
        return ResponseEntity.ok(
                new ExtractResponse(result.createdInsightIds(), result.runId(), result.aiLinkIds()));
    }

    @PostMapping("/keywords/cluster")
    @Operation(summary = "Cluster keywords with AI")
    public ResponseEntity<ClusterResponse> cluster(
            @PathVariable UUID workspaceId, @Valid @RequestBody ClusterRequest request) {
        ResearchAiService.ClusterResult result =
                researchAiService.clusterKeywords(
                        workspaceId, request.snapshotId(), request.keywords(), request.language());
        return ResponseEntity.ok(new ClusterResponse(result.createdClusterIds(), result.runId()));
    }

    @PostMapping("/personas/draft")
    @Operation(summary = "Draft persona research with AI")
    public ResponseEntity<PersonaDraftResponse> draftPersona(
            @PathVariable UUID workspaceId, @Valid @RequestBody PersonaDraftRequest request) {
        ResearchAiService.PersonaDraftResult result =
                researchAiService.draftPersonaResearch(
                        workspaceId, request.snapshotIds(), request.personaName(), request.language());
        return ResponseEntity.ok(new PersonaDraftResponse(result.personaId(), result.runId()));
    }

    @PostMapping("/digest/run")
    @Operation(summary = "Run weekly digest with AI")
    public ResponseEntity<DigestRunResponse> runDigest(
            @PathVariable UUID workspaceId, @Valid @RequestBody DigestRunRequest request) {
        ResearchAiService.DigestResult result =
                researchAiService.runWeeklyDigest(workspaceId, request.periodStart(), request.periodEnd());
        return ResponseEntity.ok(
                new DigestRunResponse(result.digestReportId(), result.workflowRunId(), result.aiLinkId()));
    }

    @GetMapping("/links")
    @Operation(summary = "List AI run links")
    public ResponseEntity<List<ResearchAiRunLinkResponse>> listAiLinks(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String producedEntityType,
            @RequestParam(required = false) UUID producedEntityId) {
        ProducedEntityType type =
                producedEntityType != null && !producedEntityType.isBlank()
                        ? ProducedEntityType.valueOf(producedEntityType)
                        : null;
        List<ResearchAiRunLink> items = researchAiService.listRunLinks(workspaceId, type, producedEntityId);
        return ResponseEntity.ok(items.stream().map(this::toResearchAiRunLinkResponse).toList());
    }

    private ResearchAiRunLinkResponse toResearchAiRunLinkResponse(ResearchAiRunLink l) {
        return new ResearchAiRunLinkResponse(
                l.getId(),
                l.getWorkspace().getId(),
                l.getAiPromptRun() != null ? l.getAiPromptRun().getId() : null,
                l.getAiConversation() != null ? l.getAiConversation().getId() : null,
                l.getAiMessage() != null ? l.getAiMessage().getId() : null,
                l.getProducedEntityType().name(),
                l.getProducedEntityId(),
                parseUuidList(l.getSnapshotIds()),
                l.getCreatedByUser().getId(),
                l.getCreatedAt());
    }

    private List<UUID> parseUuidList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<UUID>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
