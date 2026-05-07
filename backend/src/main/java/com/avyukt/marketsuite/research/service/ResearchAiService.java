package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.ai.domain.AiPromptRun;
import com.avyukt.marketsuite.ai.domain.AiWorkflowDefinition;
import com.avyukt.marketsuite.ai.domain.AiWorkflowRun;
import com.avyukt.marketsuite.ai.repo.AiWorkflowDefinitionRepository;
import com.avyukt.marketsuite.ai.service.AiFacade;
import com.avyukt.marketsuite.ai.service.AiWorkflowService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.research.domain.*;
import com.avyukt.marketsuite.research.repo.*;
import com.avyukt.marketsuite.research.service.provenance.ProvenanceService;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class ResearchAiService {

    public record SummarizeResult(
            UUID snapshotId, String summary, List<String> keyPoints,
            List<String> entities, String sentiment, UUID runId, UUID aiLinkId) {}

    public record ExtractResult(List<UUID> createdInsightIds, UUID runId, List<UUID> aiLinkIds) {}

    public record ClusterResult(List<UUID> createdClusterIds, UUID runId) {}

    public record PersonaDraftResult(UUID personaId, UUID runId) {}

    public record DigestResult(UUID digestReportId, UUID workflowRunId, UUID aiLinkId) {}

    private final AiFacade aiFacade;
    private final AiWorkflowService aiWorkflowService;
    private final AiWorkflowDefinitionRepository workflowDefRepository;
    private final ProvenanceService provenanceService;
    private final SnapshotService snapshotService;
    private final InsightService insightService;
    private final KeywordClusterService keywordClusterService;
    private final PersonaResearchService personaResearchService;
    private final ResearchJobService jobService;
    private final CompetitorService competitorService;
    private final SourceSnapshotRepository snapshotRepository;
    private final ResearchAiRunLinkRepository aiRunLinkRepository;
    private final ResearchDigestReportRepository digestReportRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ResearchAiService(
            AiFacade aiFacade,
            AiWorkflowService aiWorkflowService,
            AiWorkflowDefinitionRepository workflowDefRepository,
            ProvenanceService provenanceService,
            SnapshotService snapshotService,
            InsightService insightService,
            KeywordClusterService keywordClusterService,
            PersonaResearchService personaResearchService,
            ResearchJobService jobService,
            CompetitorService competitorService,
            SourceSnapshotRepository snapshotRepository,
            ResearchAiRunLinkRepository aiRunLinkRepository,
            ResearchDigestReportRepository digestReportRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.aiFacade = aiFacade;
        this.aiWorkflowService = aiWorkflowService;
        this.workflowDefRepository = workflowDefRepository;
        this.provenanceService = provenanceService;
        this.snapshotService = snapshotService;
        this.insightService = insightService;
        this.keywordClusterService = keywordClusterService;
        this.personaResearchService = personaResearchService;
        this.jobService = jobService;
        this.competitorService = competitorService;
        this.snapshotRepository = snapshotRepository;
        this.aiRunLinkRepository = aiRunLinkRepository;
        this.digestReportRepository = digestReportRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    public SummarizeResult summarizeSnapshot(
            UUID workspaceId, UUID snapshotId, String language,
            UUID providerOverride, String modelOverride) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchAiUse(ws.getOrg().getId(), workspaceId);

        SourceSnapshot snap = snapshotRepository.findById(snapshotId)
                .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", snapshotId));
        if (!snap.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Snapshot does not belong to this workspace");
        }

        ResearchJob job = jobService.createJob(workspaceId, JobType.AI_SUMMARIZE_SNAPSHOT,
                "{\"snapshotId\":\"" + snapshotId + "\"}");
        jobService.startJob(job.getId());

        try {
            String text = snap.getRawText() != null ? snap.getRawText()
                    : (snap.getSummaryText() != null ? snap.getSummaryText() : "");
            if (text.length() > 8000) text = text.substring(0, 8000) + "...";

            String inputJson = objectMapper.writeValueAsString(Map.of(
                    "snapshotId", snapshotId.toString(),
                    "title", snap.getTitle() != null ? snap.getTitle() : "",
                    "rawTextExcerpt", text,
                    "snapshotType", snap.getSnapshotType().name(),
                    "language", language != null ? language : "en"));

            AiPromptRun run = aiFacade.runPrompt(workspaceId,
                    "research.snapshot_summarize", inputJson, Map.of());

            String summary = "";
            List<String> keyPoints = List.of();
            List<String> entities = List.of();
            String sentiment = null;

            String output = run.getOutputJson() != null ? run.getOutputJson()
                    : (run.getOutputText() != null ? run.getOutputText() : "{}");
            try {
                JsonNode root = objectMapper.readTree(output);
                summary = root.path("summary").asText("");
                keyPoints = jsonArrayToList(root.path("keyPoints"));
                entities = jsonArrayToList(root.path("entities"));
                sentiment = root.path("sentiment").asText(null);

                Set<UUID> validIds = Set.of(snapshotId);
                provenanceService.validateCitationSnapshotIds(root, validIds);
            } catch (Exception parseEx) {
                log.warn("Failed to parse AI summarize output: {}", parseEx.getMessage());
                summary = output;
            }

            snapshotService.updateSummary(snapshotId, summary, sentiment,
                    objectMapper.writeValueAsString(keyPoints));

            ResearchAiRunLink link = provenanceService.createAiRunLinkSimple(
                    workspaceId, run.getId(), ProducedEntityType.SNAPSHOT_SUMMARY,
                    snapshotId, List.of(snapshotId));

            jobService.completeJob(job.getId(), "{\"summary_length\":" + summary.length() + "}");

            auditLog(ws, "RESEARCH_AI_SUMMARIZE", "SourceSnapshot", snapshotId,
                    "{\"runId\":\"" + run.getId() + "\"}");

            return new SummarizeResult(snapshotId, summary, keyPoints, entities,
                    sentiment, run.getId(), link.getId());
        } catch (Exception e) {
            jobService.failJob(job.getId(), e.getMessage());
            throw new BusinessException("AI summarization failed: " + e.getMessage());
        }
    }

    public ExtractResult extractCompetitorInsights(
            UUID workspaceId, UUID competitorId, List<UUID> snapshotIds,
            List<String> insightTypes, String language) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchAiUse(ws.getOrg().getId(), workspaceId);

        Competitor comp = competitorService.get(workspaceId, competitorId);
        List<SourceSnapshot> snapshots = provenanceService.validateSnapshotsBelongToWorkspace(
                workspaceId, snapshotIds);
        provenanceService.validateSnapshotsBelongToCompetitor(competitorId, snapshots);

        ResearchJob job = jobService.createJob(workspaceId, JobType.AI_EXTRACT_INSIGHTS,
                "{\"competitorId\":\"" + competitorId + "\",\"snapshotCount\":" + snapshotIds.size() + "}");
        jobService.startJob(job.getId());

        try {
            String excerpts = provenanceService.buildSnapshotExcerpts(snapshots, 4000);
            String typesStr = insightTypes != null ? String.join(",", insightTypes)
                    : "COMPETITOR_OFFER,COMPETITOR_PRICING,COMPETITOR_POSITIONING";

            String inputJson = objectMapper.writeValueAsString(Map.of(
                    "competitorName", comp.getName(),
                    "insightTypes", typesStr,
                    "snapshotExcerpts", excerpts,
                    "language", language != null ? language : "en"));

            AiPromptRun run = aiFacade.runPrompt(workspaceId,
                    "research.extract_competitor_insights", inputJson, Map.of());

            List<UUID> createdIds = new ArrayList<>();
            List<UUID> linkIds = new ArrayList<>();

            String output = run.getOutputJson() != null ? run.getOutputJson()
                    : (run.getOutputText() != null ? run.getOutputText() : "{}");
            try {
                JsonNode root = objectMapper.readTree(output);
                Set<UUID> validIds = snapshotIds.stream().collect(Collectors.toSet());
                provenanceService.validateCitationSnapshotIds(root, validIds);

                JsonNode insightsNode = root.path("insights");
                if (insightsNode.isArray()) {
                    for (JsonNode insightNode : insightsNode) {
                        InsightType iType = parseInsightType(insightNode.path("insightType").asText("COMPETITOR_OFFER"));
                        ResearchCategory cat = ResearchCategory.COMPETITOR;
                        ConfidenceLevel conf = parseConfidence(insightNode.path("confidence").asText("MEDIUM"));

                        Insight insight = insightService.create(workspaceId, cat, iType,
                                insightNode.path("title").asText("Untitled insight"),
                                insightNode.path("summary").asText(""),
                                insightNode.path("details").toString(),
                                conf, competitorId, "[]", "[]",
                                language != null ? language : "en");
                        createdIds.add(insight.getId());

                        JsonNode evidence = insightNode.path("evidence");
                        if (evidence.isArray()) {
                            for (JsonNode ev : evidence) {
                                String snapIdStr = ev.path("snapshotId").asText(null);
                                if (snapIdStr != null) {
                                    try {
                                        UUID snapId = UUID.fromString(snapIdStr);
                                        if (validIds.contains(snapId)) {
                                            insightService.addEvidence(insight.getId(), snapId,
                                                    ev.path("citationText").asText(""),
                                                    ev.path("quote").asText(null), "{}");
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }
                        }

                        ResearchAiRunLink link = provenanceService.createAiRunLinkSimple(
                                workspaceId, run.getId(), ProducedEntityType.INSIGHT_DRAFT,
                                insight.getId(), snapshotIds);
                        linkIds.add(link.getId());
                    }
                }
            } catch (Exception parseEx) {
                log.warn("Failed to parse AI extract output: {}", parseEx.getMessage());
            }

            jobService.completeJob(job.getId(),
                    "{\"insightsCreated\":" + createdIds.size() + "}");

            auditLog(ws, "RESEARCH_AI_EXTRACT", "Competitor", competitorId,
                    "{\"runId\":\"" + run.getId() + "\",\"insightsCreated\":" + createdIds.size() + "}");

            return new ExtractResult(createdIds, run.getId(), linkIds);
        } catch (Exception e) {
            jobService.failJob(job.getId(), e.getMessage());
            throw new BusinessException("AI extraction failed: " + e.getMessage());
        }
    }

    public ClusterResult clusterKeywords(
            UUID workspaceId, UUID snapshotId, List<String> keywords, String language) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchAiUse(ws.getOrg().getId(), workspaceId);

        List<UUID> sourceSnapshotIds = new ArrayList<>();
        String keywordsStr;

        if (snapshotId != null) {
            List<SourceSnapshot> snaps = provenanceService.validateSnapshotsBelongToWorkspace(
                    workspaceId, List.of(snapshotId));
            SourceSnapshot snap = snaps.get(0);
            keywordsStr = snap.getRawText() != null ? snap.getRawText() : "";
            sourceSnapshotIds.add(snapshotId);
        } else if (keywords != null && !keywords.isEmpty()) {
            keywordsStr = String.join("\n", keywords);
        } else {
            throw new BusinessException("Provide either snapshotId or keywords list");
        }

        ResearchJob job = jobService.createJob(workspaceId, JobType.AI_CLUSTER_KEYWORDS, "{}");
        jobService.startJob(job.getId());

        try {
            String inputJson = objectMapper.writeValueAsString(Map.of(
                    "keywords", keywordsStr,
                    "context", "",
                    "language", language != null ? language : "en"));

            AiPromptRun run = aiFacade.runPrompt(workspaceId,
                    "research.cluster_keywords", inputJson, Map.of());

            List<UUID> clusterIds = new ArrayList<>();
            String output = run.getOutputJson() != null ? run.getOutputJson()
                    : (run.getOutputText() != null ? run.getOutputText() : "{}");

            try {
                JsonNode root = objectMapper.readTree(output);
                JsonNode clustersNode = root.path("clusters");
                if (clustersNode.isArray()) {
                    for (JsonNode cn : clustersNode) {
                        String name = cn.path("name").asText("Cluster " + (clusterIds.size() + 1));
                        String intentType = cn.path("intentType").asText(null);
                        String kws = cn.path("keywords").toString();
                        String metrics = cn.path("metrics").toString();

                        try {
                            KeywordCluster cluster = keywordClusterService.create(workspaceId,
                                    name, intentType, kws, metrics, snapshotId);
                            clusterIds.add(cluster.getId());
                            provenanceService.createAiRunLinkSimple(workspaceId, run.getId(),
                                    ProducedEntityType.KEYWORD_CLUSTER, cluster.getId(), sourceSnapshotIds);
                        } catch (Exception createEx) {
                            log.warn("Failed to create cluster '{}': {}", name, createEx.getMessage());
                            String safeName = name + " (" + System.currentTimeMillis() + ")";
                            try {
                                KeywordCluster cluster = keywordClusterService.create(workspaceId,
                                        safeName, intentType, kws, metrics, snapshotId);
                                clusterIds.add(cluster.getId());
                                provenanceService.createAiRunLinkSimple(workspaceId, run.getId(),
                                        ProducedEntityType.KEYWORD_CLUSTER, cluster.getId(), sourceSnapshotIds);
                            } catch (Exception retryEx) {
                                log.error("Retry with safe name '{}' also failed: {}", safeName, retryEx.getMessage());
                            }
                        }
                    }
                } else {
                    log.warn("AI cluster output has no 'clusters' array. Raw output: {}",
                            output.length() > 500 ? output.substring(0, 500) : output);
                }
            } catch (Exception parseEx) {
                log.error("Failed to parse AI cluster output: {}", parseEx.getMessage(), parseEx);
            }

            jobService.completeJob(job.getId(),
                    "{\"clustersCreated\":" + clusterIds.size() + "}");

            auditLog(ws, "RESEARCH_AI_CLUSTER", "KeywordCluster", null,
                    "{\"runId\":\"" + run.getId() + "\",\"clustersCreated\":" + clusterIds.size() + "}");

            return new ClusterResult(clusterIds, run.getId());
        } catch (Exception e) {
            jobService.failJob(job.getId(), e.getMessage());
            throw new BusinessException("AI keyword clustering failed: " + e.getMessage());
        }
    }

    public PersonaDraftResult draftPersonaResearch(
            UUID workspaceId, List<UUID> snapshotIds, String personaName, String language) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchAiUse(ws.getOrg().getId(), workspaceId);

        List<SourceSnapshot> snapshots = provenanceService.validateSnapshotsBelongToWorkspace(
                workspaceId, snapshotIds);

        try {
            String excerpts = provenanceService.buildSnapshotExcerpts(snapshots, 4000);
            String inputJson = objectMapper.writeValueAsString(Map.of(
                    "personaName", personaName,
                    "snapshotExcerpts", excerpts,
                    "language", language != null ? language : "en"));

            AiPromptRun run = aiFacade.runPrompt(workspaceId,
                    "research.draft_persona", inputJson, Map.of());

            String output = run.getOutputJson() != null ? run.getOutputJson()
                    : (run.getOutputText() != null ? run.getOutputText() : "{}");

            String pains = "[]", objections = "[]", motivations = "[]", channels = "[]";
            String sentiment = null;
            try {
                JsonNode root = objectMapper.readTree(output);
                pains = root.path("pains").toString();
                objections = root.path("objections").toString();
                motivations = root.path("motivations").toString();
                channels = root.path("channels").toString();

                Set<UUID> validIds = snapshotIds.stream().collect(Collectors.toSet());
                provenanceService.validateCitationSnapshotIds(root, validIds);
            } catch (Exception parseEx) {
                log.warn("Failed to parse AI persona output: {}", parseEx.getMessage());
            }

            PersonaResearch persona = personaResearchService.create(workspaceId, personaName,
                    pains, objections, motivations, channels,
                    language != null ? language : "en", sentiment,
                    snapshotIds.isEmpty() ? null : snapshotIds.get(0));

            provenanceService.createAiRunLinkSimple(workspaceId, run.getId(),
                    ProducedEntityType.PERSONA_RESEARCH, persona.getId(), snapshotIds);

            auditLog(ws, "RESEARCH_AI_PERSONA", "PersonaResearch", persona.getId(),
                    "{\"runId\":\"" + run.getId() + "\"}");

            return new PersonaDraftResult(persona.getId(), run.getId());
        } catch (Exception e) {
            throw new BusinessException("AI persona draft failed: " + e.getMessage());
        }
    }

    public DigestResult runWeeklyDigest(UUID workspaceId, LocalDate periodStart, LocalDate periodEnd) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchAiUse(ws.getOrg().getId(), workspaceId);

        AiWorkflowDefinition workflowDef = workflowDefRepository.findByOrgId(ws.getOrg().getId())
                .stream()
                .filter(d -> "research.weekly_digest".equals(d.getName()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "AiWorkflowDefinition", "name", "research.weekly_digest"));

        ResearchJob job = jobService.createJob(workspaceId, JobType.AI_WEEKLY_DIGEST,
                "{\"periodStart\":\"" + periodStart + "\",\"periodEnd\":\"" + periodEnd + "\"}");
        jobService.startJob(job.getId());

        try {
            String inputJson = objectMapper.writeValueAsString(Map.of(
                    "periodStart", periodStart.toString(),
                    "periodEnd", periodEnd.toString()));

            AiWorkflowRun wfRun = aiWorkflowService.run(
                    workspaceId, workflowDef.getId(), inputJson, null);

            if ("FAILED".equals(wfRun.getStatus())) {
                jobService.failJob(job.getId(), wfRun.getErrorMessage());
                throw new BusinessException("Digest workflow failed: " + wfRun.getErrorMessage());
            }

            String contentText = "";
            String contentJson = "{}";
            UUID promptRunId = null;

            if (wfRun.getOutputJson() != null) {
                try {
                    JsonNode out = objectMapper.readTree(wfRun.getOutputJson());
                    JsonNode steps = out.path("steps");
                    if (steps.isArray()) {
                        for (JsonNode step : steps) {
                            JsonNode stepOutput = step.path("output");
                            if (stepOutput.has("outputText")) {
                                contentText = stepOutput.path("outputText").asText("");
                            }
                            if (stepOutput.has("promptRunId")) {
                                try {
                                    promptRunId = UUID.fromString(
                                            stepOutput.path("promptRunId").asText());
                                } catch (Exception ignored) {}
                            }
                        }
                    }
                    contentJson = wfRun.getOutputJson();
                } catch (Exception parseEx) {
                    contentText = wfRun.getOutputJson();
                }
            }

            UUID userId = SecurityUtils.currentUserId();
            AppUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

            ResearchDigestReport report = ResearchDigestReport.builder()
                    .workspace(ws)
                    .title("Weekly Digest: " + periodStart + " - " + periodEnd)
                    .periodStart(periodStart)
                    .periodEnd(periodEnd)
                    .contentText(contentText)
                    .contentJson(contentJson)
                    .createdByUser(user)
                    .build();
            report = digestReportRepository.save(report);

            ResearchAiRunLink link = provenanceService.createAiRunLinkSimple(
                    workspaceId, promptRunId, ProducedEntityType.DIGEST_REPORT,
                    report.getId(), List.of());

            jobService.completeJob(job.getId(), "{\"reportId\":\"" + report.getId() + "\"}");

            auditLog(ws, "RESEARCH_AI_DIGEST", "ResearchDigestReport", report.getId(),
                    "{\"workflowRunId\":\"" + wfRun.getId() + "\"}");

            return new DigestResult(report.getId(), wfRun.getId(), link.getId());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            jobService.failJob(job.getId(), e.getMessage());
            throw new BusinessException("AI digest failed: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<ResearchAiRunLink> listRunLinks(
            UUID workspaceId, ProducedEntityType producedEntityType, UUID producedEntityId) {
        Workspace ws = resolveWorkspace(workspaceId);
        permissionService.requireResearchRead(ws.getOrg().getId(), workspaceId);
        if (producedEntityType != null && producedEntityId != null) {
            return aiRunLinkRepository
                    .findByProducedEntityTypeAndProducedEntityId(producedEntityType, producedEntityId)
                    .stream()
                    .filter(l -> l.getWorkspace().getId().equals(workspaceId))
                    .toList();
        }
        return aiRunLinkRepository.findByWorkspaceId(workspaceId);
    }

    private Workspace resolveWorkspace(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
    }

    private List<String> jsonArrayToList(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        List<String> list = new ArrayList<>();
        for (JsonNode item : node) {
            list.add(item.asText());
        }
        return list;
    }

    private InsightType parseInsightType(String s) {
        try { return InsightType.valueOf(s); }
        catch (Exception e) { return InsightType.COMPETITOR_OFFER; }
    }

    private ConfidenceLevel parseConfidence(String s) {
        try { return ConfidenceLevel.valueOf(s); }
        catch (Exception e) { return ConfidenceLevel.MEDIUM; }
    }

    private void auditLog(Workspace ws, String action, String entityType, UUID entityId, String afterJson) {
        try {
            auditService.log(ws.getOrg().getId(), ws.getId(),
                    SecurityUtils.currentUserId(), action, entityType, entityId, null, afterJson);
        } catch (Exception e) {
            log.warn("Audit log failed for {}: {}", action, e.getMessage());
        }
    }
}
