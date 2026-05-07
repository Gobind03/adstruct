package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.GovernanceCheckRunResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.*;
import com.avyukt.marketsuite.governance.repo.BrandRuleRepository;
import com.avyukt.marketsuite.governance.repo.GovernanceCheckRunRepository;
import com.avyukt.marketsuite.governance.repo.PlatformConstraintRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.integration.domain.PlatformType;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class GovernanceCheckService {

    private final GovernanceCheckRunRepository repository;
    private final BrandRuleRepository ruleRepository;
    private final PlatformConstraintRepository constraintRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final GovernanceMapper mapper;
    private final ObjectMapper objectMapper;

    public GovernanceCheckService(
            GovernanceCheckRunRepository repository,
            BrandRuleRepository ruleRepository,
            PlatformConstraintRepository constraintRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            GovernanceMapper mapper,
            ObjectMapper objectMapper) {
        this.repository = repository;
        this.ruleRepository = ruleRepository;
        this.constraintRepository = constraintRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
    }

    public GovernanceCheckRunResponse runChecks(
            UUID workspaceId,
            String entityType,
            UUID entityId,
            String contentPayloadJson,
            UUID ruleSetId,
            PlatformType platformType,
            String language) {

        String normalizedContent = extractTextContent(contentPayloadJson).toLowerCase();
        List<ObjectNode> findings = new ArrayList<>();

        if (ruleSetId != null) {
            List<BrandRule> rules = ruleRepository.findByRuleSetIdOrderByCreatedAtDesc(ruleSetId);
            for (BrandRule rule : rules) {
                evaluateRule(rule, normalizedContent, contentPayloadJson, findings);
            }
        }

        if (platformType != null) {
            evaluatePlatformConstraints(platformType, contentPayloadJson, normalizedContent, findings);
        }

        GovernanceCheckStatus status = aggregateStatus(findings);

        ArrayNode findingsArray = objectMapper.createArrayNode();
        findings.forEach(findingsArray::add);

        GovernanceCheckRun run = GovernanceCheckRun.builder()
                .workspace(workspaceRepository.getReferenceById(workspaceId))
                .entityType(entityType)
                .entityId(entityId)
                .ruleSetId(ruleSetId)
                .platformType(platformType)
                .language(language)
                .status(status)
                .findingsJson(findingsArray.toString())
                .createdByUser(userRepository.getReferenceById(SecurityUtils.currentUserId()))
                .build();
        GovernanceCheckRun saved = repository.save(run);
        return mapper.toCheckRunResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<GovernanceCheckRunResponse> listForWorkspace(UUID workspaceId) {
        return repository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId).stream()
                .map(mapper::toCheckRunResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GovernanceCheckRunResponse> listByEntity(UUID workspaceId, String entityType, UUID entityId) {
        return repository
                .findByWorkspaceIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(workspaceId, entityType, entityId)
                .stream()
                .map(mapper::toCheckRunResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GovernanceCheckRunResponse get(UUID checkRunId) {
        GovernanceCheckRun run = repository
                .findById(checkRunId)
                .orElseThrow(() -> new ResourceNotFoundException("GovernanceCheckRun", "id", checkRunId));
        return mapper.toCheckRunResponse(run);
    }

    private void evaluateRule(BrandRule rule, String normalizedContent, String rawJson, List<ObjectNode> findings) {
        switch (rule.getRuleType()) {
            case BANNED_PHRASE -> evaluateBannedPhrase(rule, normalizedContent, findings);
            case REQUIRED_DISCLAIMER -> evaluateRequiredDisclaimer(rule, rawJson, findings);
            case CLAIM_RESTRICTION -> evaluateClaimRestriction(rule, normalizedContent, findings);
            default -> {}
        }
    }

    private void evaluateBannedPhrase(BrandRule rule, String normalizedContent, List<ObjectNode> findings) {
        String pattern = rule.getPattern();
        if (pattern == null || pattern.isBlank()) return;

        boolean found = false;
        String evidence = "";
        String lowerPattern = pattern.toLowerCase();

        if (isSimplePhrase(pattern)) {
            if (normalizedContent.contains(lowerPattern)) {
                found = true;
                evidence = "Contains banned phrase: \"" + pattern + "\"";
            }
        } else {
            try {
                Pattern regex = Pattern.compile(pattern, Pattern.CASE_INSENSITIVE);
                Matcher m = regex.matcher(normalizedContent);
                if (m.find()) {
                    found = true;
                    evidence = "Matches banned pattern: \"" + m.group() + "\"";
                }
            } catch (PatternSyntaxException ignored) {
                if (normalizedContent.contains(lowerPattern)) {
                    found = true;
                    evidence = "Contains banned phrase: \"" + pattern + "\"";
                }
            }
        }

        if (found) {
            findings.add(createFinding(
                    rule.getSeverity().name(),
                    rule.getId().toString(),
                    rule.getName(),
                    evidence,
                    "Remove or rephrase the banned content"));
        }
    }

    private void evaluateRequiredDisclaimer(BrandRule rule, String rawJson, List<ObjectNode> findings) {
        try {
            JsonNode params = objectMapper.readTree(rule.getParametersJson());
            String requiredText = params.has("requiredText") ? params.get("requiredText").asText() : null;
            if (requiredText != null && !rawJson.toLowerCase().contains(requiredText.toLowerCase())) {
                findings.add(createFinding(
                        rule.getSeverity().name(),
                        rule.getId().toString(),
                        rule.getName(),
                        "Required disclaimer text not found",
                        "Include the required disclaimer: \"" + requiredText + "\""));
            }
        } catch (Exception ignored) {
        }
    }

    private void evaluateClaimRestriction(BrandRule rule, String normalizedContent, List<ObjectNode> findings) {
        try {
            JsonNode params = objectMapper.readTree(rule.getParametersJson());
            JsonNode keywords = params.get("keywords");
            if (keywords != null && keywords.isArray()) {
                for (JsonNode kw : keywords) {
                    if (normalizedContent.contains(kw.asText().toLowerCase())) {
                        findings.add(createFinding(
                                rule.getSeverity().name(),
                                rule.getId().toString(),
                                rule.getName(),
                                "Restricted claim keyword found: \"" + kw.asText() + "\"",
                                "Verify claim is substantiated or remove it"));
                        break;
                    }
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void evaluatePlatformConstraints(
            PlatformType platformType, String rawJson, String normalizedContent, List<ObjectNode> findings) {
        var constraints = constraintRepository.findByPlatformType(platformType);
        for (PlatformConstraint constraint : constraints) {
            try {
                JsonNode value = objectMapper.readTree(constraint.getValueJson());
                switch (constraint.getConstraintType()) {
                    case TEXT_LENGTH -> {
                        int maxLength = value.has("maxLength") ? value.get("maxLength").asInt() : Integer.MAX_VALUE;
                        if (normalizedContent.length() > maxLength) {
                            findings.add(createFinding(
                                    "WARN",
                                    constraint.getId().toString(),
                                    "Text length exceeds " + platformType + " limit",
                                    "Content length: " + normalizedContent.length() + ", max: " + maxLength,
                                    "Shorten the text to " + maxLength + " characters"));
                        }
                    }
                    case HASHTAG_LIMIT -> {
                        int maxHashtags =
                                value.has("maxHashtags") ? value.get("maxHashtags").asInt() : Integer.MAX_VALUE;
                        long hashtagCount = normalizedContent.chars().filter(c -> c == '#').count();
                        if (hashtagCount > maxHashtags) {
                            findings.add(createFinding(
                                    "WARN",
                                    constraint.getId().toString(),
                                    "Hashtag count exceeds " + platformType + " limit",
                                    "Hashtags: " + hashtagCount + ", max: " + maxHashtags,
                                    "Reduce to " + maxHashtags + " hashtags"));
                        }
                    }
                    default -> {}
                }
            } catch (Exception ignored) {
            }
        }
    }

    private GovernanceCheckStatus aggregateStatus(List<ObjectNode> findings) {
        boolean hasBlock = false;
        boolean hasWarn = false;
        for (ObjectNode f : findings) {
            String sev = f.get("severity").asText();
            if ("BLOCK".equals(sev)) hasBlock = true;
            if ("WARN".equals(sev)) hasWarn = true;
        }
        if (hasBlock) return GovernanceCheckStatus.FAIL;
        if (hasWarn) return GovernanceCheckStatus.WARN;
        return GovernanceCheckStatus.PASS;
    }

    private String extractTextContent(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            StringBuilder sb = new StringBuilder();
            extractTextRecursive(node, sb);
            return sb.toString();
        } catch (Exception e) {
            return json;
        }
    }

    private void extractTextRecursive(JsonNode node, StringBuilder sb) {
        if (node.isTextual()) {
            sb.append(node.asText()).append(" ");
        } else if (node.isObject()) {
            node.fields().forEachRemaining(entry -> extractTextRecursive(entry.getValue(), sb));
        } else if (node.isArray()) {
            node.forEach(child -> extractTextRecursive(child, sb));
        }
    }

    private boolean isSimplePhrase(String pattern) {
        return pattern.matches("[\\w\\s]+");
    }

    private ObjectNode createFinding(String severity, String ruleId, String message, String evidence, String suggestion) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("severity", severity);
        node.put("ruleId", ruleId);
        node.put("message", message);
        node.put("evidence", evidence);
        node.put("suggestion", suggestion);
        return node;
    }
}
