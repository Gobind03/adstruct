package com.avyukt.marketsuite.ai.service.safety;

import com.avyukt.marketsuite.ai.domain.AiRedactionRule;
import com.avyukt.marketsuite.ai.domain.AiSafetyPolicy;
import com.avyukt.marketsuite.ai.domain.SafetyDecision;
import com.avyukt.marketsuite.ai.domain.ToolRiskLevel;
import com.avyukt.marketsuite.ai.repo.AiRedactionRuleRepository;
import com.avyukt.marketsuite.ai.repo.AiSafetyPolicyRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiSafetyService {

    private static final int DEFAULT_MAX_TOOL_CALLS_PER_TURN = 3;

    private static final List<CompiledRedaction> BUILTIN_REDACTIONS =
            List.of(
                    CompiledRedaction.literal(
                            Pattern.compile("sk-[A-Za-z0-9]{20,}"), "[REDACTED_API_KEY]"),
                    CompiledRedaction.literal(
                            Pattern.compile("Bearer [A-Za-z0-9._-]{20,}"),
                            "Bearer [REDACTED_TOKEN]"),
                    CompiledRedaction.literal(
                            Pattern.compile("AKIA[A-Z0-9]{16}"), "[REDACTED_AWS_KEY]"),
                    CompiledRedaction.template(
                            Pattern.compile(
                                    "(?i)(password|secret|token|api_key)\\s*[=:]\\s*\\S+"),
                            "$1=[REDACTED]"));

    private final AiSafetyPolicyRepository safetyPolicyRepository;
    private final AiRedactionRuleRepository redactionRuleRepository;
    private final ObjectMapper objectMapper;

    /** Workspace-scoped compiled DB redaction rules (invalid patterns skipped). */
    private final ConcurrentHashMap<UUID, List<CompiledRedaction>> redactionPatternCache =
            new ConcurrentHashMap<>();

    public String redactSecrets(UUID workspaceId, String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        List<CompiledRedaction> workspaceRules =
                redactionPatternCache.computeIfAbsent(workspaceId, this::loadWorkspaceRedactionRules);
        String result = text;
        for (CompiledRedaction rule : workspaceRules) {
            result = rule.apply(result);
        }
        for (CompiledRedaction builtin : BUILTIN_REDACTIONS) {
            result = builtin.apply(result);
        }
        return result;
    }

    private List<CompiledRedaction> loadWorkspaceRedactionRules(UUID workspaceId) {
        List<AiRedactionRule> rules = redactionRuleRepository.findByWorkspaceIdAndEnabledTrue(workspaceId);
        if (rules.isEmpty()) {
            return List.of();
        }
        List<CompiledRedaction> compiled = new ArrayList<>();
        for (AiRedactionRule rule : rules) {
            try {
                compiled.add(
                        CompiledRedaction.literal(
                                Pattern.compile(rule.getPattern()), rule.getReplacement()));
            } catch (PatternSyntaxException e) {
                log.warn(
                        "Skipping invalid redaction pattern for workspace {} rule {}: {}",
                        workspaceId,
                        rule.getId(),
                        rule.getPattern(),
                        e);
            }
        }
        return Collections.unmodifiableList(compiled);
    }

    public SafetyDecision classifySafety(UUID workspaceId, String inputText) {
        if (inputText == null || inputText.isEmpty()) {
            return SafetyDecision.ALLOW;
        }
        Optional<AiSafetyPolicy> policyOpt = safetyPolicyRepository.findByWorkspaceId(workspaceId);
        if (policyOpt.isEmpty()) {
            return SafetyDecision.ALLOW;
        }
        JsonNode root = parsePolicyJson(policyOpt.get().getPolicyJson());
        String lower = inputText.toLowerCase(Locale.ROOT);
        for (String phrase : readStringArray(root, "bannedPhrases")) {
            if (phrase != null && !phrase.isEmpty() && lower.contains(phrase.toLowerCase(Locale.ROOT))) {
                return SafetyDecision.BLOCK;
            }
        }
        for (String topic : readStringArray(root, "blockedTopics")) {
            if (topic != null && !topic.isEmpty() && lower.contains(topic.toLowerCase(Locale.ROOT))) {
                return SafetyDecision.BLOCK;
            }
        }
        return SafetyDecision.ALLOW;
    }

    public SafetyDecision checkToolPermission(
            UUID workspaceId, String toolName, ToolRiskLevel riskLevel, String userRole) {
        if (toolName == null || toolName.isEmpty()) {
            return SafetyDecision.BLOCK;
        }
        Optional<AiSafetyPolicy> policyOpt = safetyPolicyRepository.findByWorkspaceId(workspaceId);
        if (policyOpt.isEmpty()) {
            return SafetyDecision.ALLOW;
        }
        JsonNode root = parsePolicyJson(policyOpt.get().getPolicyJson());
        List<String> allowedPatterns = readStringArray(root, "allowedTools");
        if (allowedPatterns.isEmpty()) {
            return SafetyDecision.BLOCK;
        }
        boolean allowed =
                allowedPatterns.stream().anyMatch(pattern -> matchesToolPattern(toolName, pattern));
        if (!allowed) {
            return SafetyDecision.BLOCK;
        }
        boolean requireApproval = root.path("requireApprovalForWrites").asBoolean(false);
        boolean isAdmin = isElevatedAdminRole(userRole);
        if (requireApproval
                && riskLevel != ToolRiskLevel.READ_ONLY
                && !isAdmin) {
            return SafetyDecision.WARN;
        }
        return SafetyDecision.ALLOW;
    }

    public boolean canMakeMoreToolCalls(UUID workspaceId, UUID conversationId, int currentCallCount) {
        int max =
                safetyPolicyRepository
                        .findByWorkspaceId(workspaceId)
                        .map(p -> parsePolicyJson(p.getPolicyJson()))
                        .map(root -> root.path("maxToolCallsPerTurn"))
                        .filter(JsonNode::isNumber)
                        .map(JsonNode::asInt)
                        .filter(v -> v > 0)
                        .orElse(DEFAULT_MAX_TOOL_CALLS_PER_TURN);
        return currentCallCount < max;
    }

    public void clearRedactionCache(UUID workspaceId) {
        redactionPatternCache.remove(workspaceId);
    }

    private JsonNode parsePolicyJson(String policyJson) {
        if (policyJson == null || policyJson.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(policyJson);
        } catch (Exception e) {
            log.warn("Invalid policy JSON for workspace policy; treating as empty: {}", e.getMessage());
            return objectMapper.createObjectNode();
        }
    }

    private static List<String> readStringArray(JsonNode root, String field) {
        JsonNode node = root.path(field);
        if (!node.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (JsonNode el : node) {
            if (el != null && el.isTextual()) {
                out.add(el.asText());
            }
        }
        return out;
    }

    private static boolean matchesToolPattern(String toolName, String pattern) {
        if (pattern == null || pattern.isEmpty()) {
            return false;
        }
        try {
            String regex = globToRegex(pattern);
            return Pattern.compile(regex).matcher(toolName).matches();
        } catch (PatternSyntaxException e) {
            return false;
        }
    }

    /**
     * Turns a simple glob ({@code *} only) into a regex that matches the full tool name.
     */
    static String globToRegex(String glob) {
        StringBuilder out = new StringBuilder("^");
        for (int i = 0; i < glob.length(); i++) {
            char c = glob.charAt(i);
            if (c == '*') {
                out.append(".*");
            } else {
                out.append(Pattern.quote(String.valueOf(c)));
            }
        }
        out.append('$');
        return out.toString();
    }

    private static boolean isElevatedAdminRole(String userRole) {
        if (userRole == null || userRole.isEmpty()) {
            return false;
        }
        String r = userRole.startsWith("ROLE_") ? userRole.substring("ROLE_".length()) : userRole;
        return "ORG_ADMIN".equalsIgnoreCase(r) || "WORKSPACE_ADMIN".equalsIgnoreCase(r);
    }

    private record CompiledRedaction(Pattern pattern, String replacement, boolean literalReplacement) {
        static CompiledRedaction literal(Pattern pattern, String replacement) {
            String r = replacement == null ? "[REDACTED]" : replacement;
            return new CompiledRedaction(pattern, r, true);
        }

        static CompiledRedaction template(Pattern pattern, String replacement) {
            return new CompiledRedaction(pattern, replacement, false);
        }

        String apply(String input) {
            Matcher m = pattern.matcher(input);
            return literalReplacement ? m.replaceAll(Matcher.quoteReplacement(replacement)) : m.replaceAll(replacement);
        }
    }
}
