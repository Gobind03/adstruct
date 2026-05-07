package com.avyukt.marketsuite.research.service.provenance;

import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.research.domain.ProducedEntityType;
import com.avyukt.marketsuite.research.domain.ResearchAiRunLink;
import com.avyukt.marketsuite.research.domain.SourceSnapshot;
import com.avyukt.marketsuite.research.repo.ResearchAiRunLinkRepository;
import com.avyukt.marketsuite.research.repo.ResearchSourceRepository;
import com.avyukt.marketsuite.research.repo.SourceSnapshotRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class ProvenanceService {

    private final SourceSnapshotRepository snapshotRepository;
    private final ResearchSourceRepository sourceRepository;
    private final ResearchAiRunLinkRepository aiRunLinkRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ProvenanceService(
            SourceSnapshotRepository snapshotRepository,
            ResearchSourceRepository sourceRepository,
            ResearchAiRunLinkRepository aiRunLinkRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            ObjectMapper objectMapper) {
        this.snapshotRepository = snapshotRepository;
        this.sourceRepository = sourceRepository;
        this.aiRunLinkRepository = aiRunLinkRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public List<SourceSnapshot> validateSnapshotsBelongToWorkspace(UUID workspaceId, List<UUID> snapshotIds) {
        if (snapshotIds == null || snapshotIds.isEmpty()) {
            throw new BusinessException("At least one snapshot ID is required");
        }
        List<SourceSnapshot> snapshots = new ArrayList<>();
        for (UUID sid : snapshotIds) {
            SourceSnapshot snap = snapshotRepository.findById(sid)
                    .orElseThrow(() -> new ResourceNotFoundException("SourceSnapshot", "id", sid));
            if (!snap.getWorkspace().getId().equals(workspaceId)) {
                throw new BusinessException("Snapshot " + sid + " does not belong to workspace " + workspaceId);
            }
            snapshots.add(snap);
        }
        return snapshots;
    }

    public void validateSnapshotsBelongToCompetitor(UUID competitorId, List<SourceSnapshot> snapshots) {
        for (SourceSnapshot snap : snapshots) {
            if (snap.getSource() == null || snap.getSource().getCompetitor() == null
                    || !snap.getSource().getCompetitor().getId().equals(competitorId)) {
                throw new BusinessException(
                        "Snapshot " + snap.getId() + " is not linked to competitor " + competitorId
                                + ". Link the source to this competitor first.");
            }
        }
    }

    public ResearchAiRunLink createAiRunLink(
            UUID workspaceId,
            UUID aiPromptRunId,
            UUID aiConversationId,
            UUID aiMessageId,
            ProducedEntityType producedEntityType,
            UUID producedEntityId,
            List<UUID> snapshotIds) {
        UUID userId = SecurityUtils.currentUserId();
        Workspace ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        String snapshotIdsJson;
        try {
            snapshotIdsJson = objectMapper.writeValueAsString(snapshotIds != null ? snapshotIds : List.of());
        } catch (Exception e) {
            snapshotIdsJson = "[]";
        }

        ResearchAiRunLink link = ResearchAiRunLink.builder()
                .workspace(ws)
                .producedEntityType(producedEntityType)
                .producedEntityId(producedEntityId)
                .snapshotIds(snapshotIdsJson)
                .createdByUser(user)
                .build();

        if (aiPromptRunId != null) {
            link.setAiPromptRun(
                    new com.avyukt.marketsuite.ai.domain.AiPromptRun());
        }
        if (aiConversationId != null) {
            link.setAiConversation(
                    new com.avyukt.marketsuite.ai.domain.AiConversation());
        }

        return aiRunLinkRepository.save(link);
    }

    public ResearchAiRunLink createAiRunLinkSimple(
            UUID workspaceId,
            UUID aiPromptRunId,
            ProducedEntityType producedEntityType,
            UUID producedEntityId,
            List<UUID> snapshotIds) {
        UUID userId = SecurityUtils.currentUserId();
        Workspace ws = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", userId));

        String snapshotIdsJson;
        try {
            snapshotIdsJson = objectMapper.writeValueAsString(snapshotIds != null ? snapshotIds : List.of());
        } catch (Exception e) {
            snapshotIdsJson = "[]";
        }

        ResearchAiRunLink link = ResearchAiRunLink.builder()
                .workspace(ws)
                .producedEntityType(producedEntityType)
                .producedEntityId(producedEntityId)
                .snapshotIds(snapshotIdsJson)
                .createdByUser(user)
                .build();

        return aiRunLinkRepository.save(link);
    }

    public void validateCitationSnapshotIds(JsonNode outputJson, Set<UUID> validSnapshotIds) {
        if (outputJson == null) return;

        JsonNode citations = outputJson.path("citations");
        if (citations.isMissingNode() || !citations.isArray()) {
            JsonNode insights = outputJson.path("insights");
            if (insights.isArray()) {
                for (JsonNode insight : insights) {
                    JsonNode evidence = insight.path("evidence");
                    if (evidence.isArray()) {
                        validateEvidenceArray(evidence, validSnapshotIds);
                    }
                }
            }
            return;
        }
        validateEvidenceArray(citations, validSnapshotIds);
    }

    private void validateEvidenceArray(JsonNode evidenceArray, Set<UUID> validSnapshotIds) {
        for (JsonNode item : evidenceArray) {
            String snapshotIdStr = item.path("snapshotId").asText(null);
            if (snapshotIdStr != null && !snapshotIdStr.isBlank()) {
                try {
                    UUID cited = UUID.fromString(snapshotIdStr);
                    if (!validSnapshotIds.contains(cited)) {
                        log.warn("AI output cited invalid snapshotId {}, ignoring citation", cited);
                    }
                } catch (IllegalArgumentException e) {
                    log.warn("AI output cited non-UUID snapshotId: {}", snapshotIdStr);
                }
            }
        }
    }

    public String buildSnapshotExcerpts(List<SourceSnapshot> snapshots, int maxCharsPerSnapshot) {
        StringBuilder sb = new StringBuilder();
        for (SourceSnapshot snap : snapshots) {
            sb.append("--- Snapshot ID: ").append(snap.getId()).append(" ---\n");
            if (snap.getTitle() != null) {
                sb.append("Title: ").append(snap.getTitle()).append("\n");
            }
            String text = snap.getRawText() != null ? snap.getRawText()
                    : (snap.getSummaryText() != null ? snap.getSummaryText() : "");
            if (text.length() > maxCharsPerSnapshot) {
                text = text.substring(0, maxCharsPerSnapshot) + "...";
            }
            sb.append(text).append("\n\n");
        }
        return sb.toString();
    }
}
