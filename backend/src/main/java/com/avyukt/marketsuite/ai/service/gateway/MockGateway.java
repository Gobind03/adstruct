package com.avyukt.marketsuite.ai.service.gateway;

import com.avyukt.marketsuite.ai.domain.LlmCallPurpose;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MockGateway implements LlmGateway {

    private static final String ROUTING_JSON =
            "{\"toolName\":\"research.searchInsights\",\"confidence\":0.9}";

    private static final Pattern SNAPSHOT_ID_LINE =
            Pattern.compile("Snapshot ID:\\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})");

    private final ObjectMapper objectMapper;

    @Override
    public LlmResponse chat(LlmRequest request) {
        long start = System.currentTimeMillis();
        List<LlmMessage> messages = request.messages() != null ? request.messages() : List.of();
        String lastUser = lastUserContent(messages);
        String fullText =
                messages.stream()
                        .map(LlmMessage::content)
                        .filter(c -> c != null)
                        .collect(Collectors.joining("\n"));
        int inputWords = countWords(messages.stream().map(LlmMessage::content).collect(Collectors.joining(" ")));

        String text;
        String json = null;

        LlmCallPurpose purpose = request.purpose();
        if (purpose == LlmCallPurpose.TOOL_ROUTING) {
            json = ROUTING_JSON;
            text = ROUTING_JSON;
        } else if (purpose == LlmCallPurpose.CLASSIFY) {
            String combined = (lastUser + "\n" + fullText).toLowerCase(Locale.ROOT);
            String clusterJson;
            if (combined.contains("enrich") && combined.contains("metadata")
                    || combined.contains("asset") && combined.contains("tags")) {
                clusterJson = buildEnrichAssetJson();
            } else {
                List<String> extractedKws = extractKeywordsFromPrompt(fullText);
                clusterJson = buildClassifyJsonFromKeywords(extractedKws);
            }
            json = clusterJson;
            text = clusterJson;
        } else if (purpose == LlmCallPurpose.CHAT) {
            text = "Based on your request about: " + lastUser + ". Here is my analysis...";
        } else if (purpose == LlmCallPurpose.GENERATE) {
            String combined = (lastUser + "\n" + fullText).toLowerCase(Locale.ROOT);
            String genJson;
            if (combined.contains("ad copy variants")) {
                genJson = buildAdCopyVariantsJson();
            } else if (combined.contains("hooks, angles, and ctas")
                    || combined.contains("hooks") && combined.contains("angles") && combined.contains("ctas")) {
                genJson = buildHooksAnglesCtas();
            } else if (combined.contains("video script")) {
                genJson = buildVideoScriptJson();
            } else if (combined.contains("ugc") && combined.contains("brief")) {
                genJson = buildUgcBriefJson();
            } else if (combined.contains("enrich") && combined.contains("metadata")) {
                genJson = buildEnrichAssetJson();
            } else if (combined.contains("persona")) {
                genJson = buildPersonaJson();
            } else {
                genJson = buildDigestJson();
            }
            json = genJson;
            text = genJson;
        } else if (purpose == LlmCallPurpose.SUMMARIZE) {
            String snapshotId = extractFirstSnapshotId(fullText);
            String sumJson = buildSummarizeJson(snapshotId);
            json = sumJson;
            text = sumJson;
        } else if (purpose == LlmCallPurpose.EXTRACT) {
            List<String> ids = extractSnapshotIds(fullText);
            String extJson = buildExtractJson(ids);
            json = extJson;
            text = extJson;
        } else {
            text =
                    messages.stream()
                            .map(m -> m.role() + ": " + m.content())
                            .collect(Collectors.joining("\n"));
        }

        int outputWords = countWords(text);
        long latencyMs = System.currentTimeMillis() - start;
        return buildResponse(text, json, latencyMs, inputWords, outputWords);
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        return chat(request);
    }

    private String buildSummarizeJson(String snapshotId) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("summary", "Mock summary of the snapshot content.");
            ArrayNode keyPoints = objectMapper.createArrayNode();
            keyPoints.add("Key point 1");
            keyPoints.add("Key point 2");
            root.set("keyPoints", keyPoints);
            ArrayNode entities = objectMapper.createArrayNode();
            entities.add("Entity A");
            root.set("entities", entities);
            root.put("sentiment", "NEUTRAL");
            ArrayNode citations = objectMapper.createArrayNode();
            ObjectNode cit = objectMapper.createObjectNode();
            cit.put("snapshotId", snapshotId != null ? snapshotId : "");
            cit.put("evidence", "Based on provided content");
            citations.add(cit);
            root.set("citations", citations);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"summary\":\"\",\"keyPoints\":[],\"entities\":[],\"sentiment\":\"NEUTRAL\",\"citations\":[]}";
        }
    }

    private String buildExtractJson(List<String> snapshotIds) {
        try {
            String firstId = snapshotIds.isEmpty() ? "" : snapshotIds.get(0);
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode insights = objectMapper.createArrayNode();
            ObjectNode ins = objectMapper.createObjectNode();
            ins.put("insightType", "COMPETITOR_OFFER");
            ins.put("title", "Mock competitor offer insight");
            ins.put("summary", "Mock analysis of competitor offer based on provided snapshots.");
            ins.set("details", objectMapper.createObjectNode());
            ArrayNode evidence = objectMapper.createArrayNode();
            ObjectNode ev = objectMapper.createObjectNode();
            ev.put("snapshotId", firstId);
            ev.put("citationText", "Mock citation from snapshot");
            ev.put("quote", "mock quote");
            evidence.add(ev);
            ins.set("evidence", evidence);
            ins.put("confidence", "MEDIUM");
            insights.add(ins);
            root.set("insights", insights);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"insights\":[]}";
        }
    }

    private String buildClassifyJson() {
        return buildClassifyJsonFromKeywords(List.of());
    }

    private String buildClassifyJsonFromKeywords(List<String> inputKeywords) {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode clusters = objectMapper.createArrayNode();

            if (inputKeywords.isEmpty()) {
                ObjectNode c = objectMapper.createObjectNode();
                c.put("name", "General Cluster " + System.currentTimeMillis());
                c.put("intentType", "informational");
                ArrayNode kws = objectMapper.createArrayNode();
                kws.add("keyword1");
                kws.add("keyword2");
                c.set("keywords", kws);
                ObjectNode metrics = objectMapper.createObjectNode();
                metrics.put("avgVolume", 100);
                metrics.put("avgCpc", 0.5);
                metrics.put("difficulty", 30);
                c.set("metrics", metrics);
                c.set("evidence", objectMapper.createArrayNode());
                clusters.add(c);
            } else {
                String[] intents = {"informational", "commercial", "transactional", "navigational"};
                int chunkSize = Math.max(1, (int) Math.ceil((double) inputKeywords.size() / Math.min(inputKeywords.size(), 4)));
                int clusterIdx = 0;
                for (int i = 0; i < inputKeywords.size() && clusterIdx < 4; i += chunkSize) {
                    int end = Math.min(i + chunkSize, inputKeywords.size());
                    List<String> chunk = inputKeywords.subList(i, end);
                    if (chunk.isEmpty()) continue;

                    String intent = intents[clusterIdx % intents.length];
                    ObjectNode c = objectMapper.createObjectNode();
                    c.put("name", capitalize(intent) + " — " + chunk.get(0));
                    c.put("intentType", intent);
                    ArrayNode kwArr = objectMapper.createArrayNode();
                    chunk.forEach(kwArr::add);
                    c.set("keywords", kwArr);
                    ObjectNode metrics = objectMapper.createObjectNode();
                    metrics.put("avgVolume", 50 + clusterIdx * 80);
                    metrics.put("avgCpc", 0.3 + clusterIdx * 0.4);
                    metrics.put("difficulty", 20 + clusterIdx * 15);
                    c.set("metrics", metrics);
                    c.set("evidence", objectMapper.createArrayNode());
                    clusters.add(c);
                    clusterIdx++;
                }
            }
            root.set("clusters", clusters);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"clusters\":[]}";
        }
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase(Locale.ROOT) + s.substring(1);
    }

    private String buildDigestJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("title", "Weekly Research Digest");
            ArrayNode highlights = objectMapper.createArrayNode();
            highlights.add("Highlight 1");
            root.set("highlights", highlights);
            root.set("risks", objectMapper.createArrayNode());
            ArrayNode opportunities = objectMapper.createArrayNode();
            opportunities.add("Opportunity 1");
            root.set("opportunities", opportunities);
            ArrayNode actions = objectMapper.createArrayNode();
            actions.add("Action 1");
            root.set("recommendedActions", actions);
            root.put("narrative", "Mock weekly digest narrative.");
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"title\":\"Weekly Research Digest\",\"highlights\":[],\"risks\":[],"
                    + "\"opportunities\":[],\"recommendedActions\":[],\"narrative\":\"\"}";
        }
    }

    /** JSON for {@code creative.generate_ad_copy_variants}; must run before the generic "persona" branch. */
    private String buildAdCopyVariantsJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode variants = objectMapper.createArrayNode();
            for (int i = 0; i < 2; i++) {
                ObjectNode v = objectMapper.createObjectNode();
                v.put("primaryText", "Mock primary text " + (i + 1));
                v.put("headline", "Mock headline " + (i + 1));
                v.put("description", "Mock description " + (i + 1));
                v.put("cta", "Learn more");
                variants.add(v);
            }
            root.set("variants", variants);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"variants\":[{\"primaryText\":\"A\",\"headline\":\"H\",\"description\":\"D\",\"cta\":\"C\"}]}";
        }
    }

    private String buildHooksAnglesCtas() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode hooks = objectMapper.createArrayNode();
            hooks.add("What if everything you know about this product is wrong?");
            hooks.add("Stop scrolling — this changes everything.");
            hooks.add("The #1 mistake people make with this type of product.");
            root.set("hooks", hooks);
            ArrayNode angles = objectMapper.createArrayNode();
            angles.add("Pain point: frustrated with slow results → instant solution");
            angles.add("Social proof: join 10,000+ customers who switched");
            angles.add("Authority: backed by industry experts and research");
            root.set("angles", angles);
            ArrayNode ctas = objectMapper.createArrayNode();
            ctas.add("Shop Now");
            ctas.add("Get Started Free");
            ctas.add("Claim Your Discount");
            ctas.add("Try Risk-Free");
            root.set("ctas", ctas);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"hooks\":[\"Hook 1\"],\"angles\":[\"Angle 1\"],\"ctas\":[\"CTA 1\"]}";
        }
    }

    private String buildVideoScriptJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("script", "Scene 1: Open on a close-up of the product. "
                    + "Voiceover: 'Meet the product that changed everything.' "
                    + "Scene 2: Show the product in use. "
                    + "Voiceover: 'See the difference for yourself.' "
                    + "Scene 3: End card with CTA. "
                    + "Voiceover: 'Get yours today — link in bio.'");
            ArrayNode scenes = objectMapper.createArrayNode();
            ObjectNode s1 = objectMapper.createObjectNode();
            s1.put("scene", 1);
            s1.put("visual", "Close-up of product on clean surface, slow zoom in");
            s1.put("audio", "Voiceover: 'Meet the product that changed everything.'");
            s1.put("caption", "The product that changed everything");
            scenes.add(s1);
            ObjectNode s2 = objectMapper.createObjectNode();
            s2.put("scene", 2);
            s2.put("visual", "Person using product, split-screen before/after");
            s2.put("audio", "Voiceover: 'See the difference for yourself.'");
            s2.put("caption", "See the difference");
            scenes.add(s2);
            ObjectNode s3 = objectMapper.createObjectNode();
            s3.put("scene", 3);
            s3.put("visual", "End card with brand logo and CTA button");
            s3.put("audio", "Voiceover: 'Get yours today — link in bio.'");
            s3.put("caption", "Get yours today");
            scenes.add(s3);
            root.set("scenes", scenes);
            root.put("durationSeconds", 30);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"script\":\"Mock video script.\",\"scenes\":[],\"durationSeconds\":30}";
        }
    }

    private String buildUgcBriefJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("brief", "Creator Brief: Film a 30-60 second video showcasing the product in your daily routine. "
                    + "Start with an attention-grabbing hook, demonstrate the key benefit, and end with a clear call-to-action. "
                    + "Keep it authentic and conversational — your audience should feel like they're getting advice from a friend.");
            root.put("briefTitle", "Product Showcase — Authentic Daily Routine");
            root.put("objective", "Generate authentic social proof through creator content");
            ArrayNode deliverables = objectMapper.createArrayNode();
            ObjectNode d1 = objectMapper.createObjectNode();
            d1.put("format", "Vertical Video (9:16)");
            d1.put("description", "30-60 second product showcase in daily routine");
            d1.put("duration", "30-60 seconds");
            deliverables.add(d1);
            ObjectNode d2 = objectMapper.createObjectNode();
            d2.put("format", "Photo Carousel");
            d2.put("description", "3-5 lifestyle photos showing product in use");
            d2.put("duration", "N/A");
            deliverables.add(d2);
            root.set("deliverables", deliverables);
            ObjectNode guidelines = objectMapper.createObjectNode();
            ArrayNode dos = objectMapper.createArrayNode();
            dos.add("Use natural lighting");
            dos.add("Show genuine reaction to the product");
            dos.add("Include a clear CTA");
            guidelines.set("dos", dos);
            ArrayNode donts = objectMapper.createArrayNode();
            donts.add("Don't use overly polished production");
            donts.add("Don't make medical or legal claims");
            donts.add("Don't mention competitor brands");
            guidelines.set("donts", donts);
            root.set("guidelines", guidelines);
            ArrayNode talkingPoints = objectMapper.createArrayNode();
            talkingPoints.add("How the product fits into your routine");
            talkingPoints.add("The key benefit you noticed");
            talkingPoints.add("Why you'd recommend it");
            root.set("talkingPoints", talkingPoints);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"brief\":\"Mock UGC brief.\",\"briefTitle\":\"Mock Brief\",\"objective\":\"Mock objective\","
                    + "\"deliverables\":[],\"guidelines\":{\"dos\":[],\"donts\":[]},\"talkingPoints\":[]}";
        }
    }

    private String buildEnrichAssetJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode tags = objectMapper.createArrayNode();
            tags.add("product-shot");
            tags.add("lifestyle");
            tags.add("hero-image");
            tags.add("high-resolution");
            root.set("suggestedTags", tags);
            ArrayNode formats = objectMapper.createArrayNode();
            formats.add("1080x1080 (Instagram Feed)");
            formats.add("1200x628 (Facebook/LinkedIn)");
            formats.add("1080x1920 (Stories/Reels)");
            root.set("suggestedFormats", formats);
            ArrayNode warnings = objectMapper.createArrayNode();
            warnings.add("Consider adding alt text for accessibility");
            root.set("qualityWarnings", warnings);
            root.put("altText", "Product image showing the item in a lifestyle setting with natural lighting");
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"suggestedTags\":[\"tag1\"],\"suggestedFormats\":[],\"qualityWarnings\":[],\"altText\":\"Mock alt text\"}";
        }
    }

    private String buildPersonaJson() {
        try {
            ObjectNode root = objectMapper.createObjectNode();
            root.put("name", "Mock Persona");
            ArrayNode goals = objectMapper.createArrayNode();
            goals.add("Achieve outcome A");
            root.set("goals", goals);
            ArrayNode painPoints = objectMapper.createArrayNode();
            painPoints.add("Pain point 1");
            root.set("painPoints", painPoints);
            ArrayNode behaviors = objectMapper.createArrayNode();
            behaviors.add("Researches online before purchase");
            root.set("behaviors", behaviors);
            return objectMapper.writeValueAsString(root);
        } catch (Exception e) {
            return "{\"name\":\"Mock Persona\",\"goals\":[],\"painPoints\":[],\"behaviors\":[]}";
        }
    }

    private static List<String> extractKeywordsFromPrompt(String text) {
        if (text == null || text.isBlank()) return List.of();
        int kwStart = text.indexOf("Keywords:\n");
        if (kwStart < 0) kwStart = text.indexOf("Keywords:");
        if (kwStart < 0) {
            int nlIdx = text.lastIndexOf('\n');
            String lastLine = nlIdx >= 0 ? text.substring(nlIdx + 1).trim() : text.trim();
            if (!lastLine.isBlank()) {
                return List.of(lastLine.split("\\n")).stream()
                        .map(String::trim).filter(s -> !s.isEmpty()).toList();
            }
            return List.of();
        }
        String afterKw = text.substring(kwStart + (text.charAt(kwStart + 8) == ':' ? 9 : 10));
        int endIdx = afterKw.indexOf("\n\nReturn JSON");
        if (endIdx < 0) endIdx = afterKw.indexOf("\n\n{");
        String block = endIdx >= 0 ? afterKw.substring(0, endIdx) : afterKw;
        return block.lines()
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !s.startsWith("{") && !s.startsWith("\""))
                .toList();
    }

    private static String extractFirstSnapshotId(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        Matcher m = SNAPSHOT_ID_LINE.matcher(text);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    private static List<String> extractSnapshotIds(String text) {
        List<String> ids = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return ids;
        }
        Matcher m = SNAPSHOT_ID_LINE.matcher(text);
        while (m.find()) {
            ids.add(m.group(1));
        }
        return ids;
    }

    private static String lastUserContent(List<LlmMessage> messages) {
        for (int i = messages.size() - 1; i >= 0; i--) {
            LlmMessage m = messages.get(i);
            if (m.role() != null && "user".equalsIgnoreCase(m.role())) {
                return m.content() != null ? m.content() : "";
            }
        }
        return messages.isEmpty() || messages.get(messages.size() - 1).content() == null
                ? ""
                : messages.get(messages.size() - 1).content();
    }

    private static int countWords(String s) {
        if (s == null || s.isBlank()) {
            return 0;
        }
        return s.trim().split("\\s+").length;
    }

    private static LlmResponse buildResponse(
            String text, String json, long latencyMs, int inputWords, int outputWords) {
        long promptTokens = Math.round(inputWords * 1.3);
        long completionTokens = Math.round(outputWords * 1.3);
        Map<String, Object> usage = new LinkedHashMap<>();
        usage.put("prompt_tokens", promptTokens);
        usage.put("completion_tokens", completionTokens);
        usage.put("total_tokens", promptTokens + completionTokens);
        return new LlmResponse(text, json, usage, latencyMs, Map.of());
    }
}
