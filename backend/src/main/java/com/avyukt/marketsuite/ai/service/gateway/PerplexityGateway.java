package com.avyukt.marketsuite.ai.service.gateway;

import com.avyukt.marketsuite.common.secret.SecretStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
public class PerplexityGateway implements LlmGateway {

    private static final String CHAT_COMPLETIONS_URL = "https://api.perplexity.ai/chat/completions";

    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final SecretStore secretStore;

    public PerplexityGateway(ObjectMapper objectMapper, SecretStore secretStore) {
        this.client = RestClient.builder().build();
        this.objectMapper = objectMapper;
        this.secretStore = secretStore;
    }

    @Override
    public LlmResponse chat(LlmRequest request) {
        long start = System.currentTimeMillis();
        try {
            String secretRef = request.metadata() != null ? request.metadata().get("secretRef") : null;
            if (secretRef == null || secretRef.isBlank()) {
                return errorResponse(
                        "Missing metadata secretRef for Perplexity API key.",
                        System.currentTimeMillis() - start);
            }
            String apiKey = extractApiKey(secretStore.retrieve(secretRef));
            if (apiKey == null || apiKey.isBlank()) {
                return errorResponse(
                        "No API key found in SecretStore for ref: " + secretRef,
                        System.currentTimeMillis() - start);
            }

            String model =
                    request.model() == null || request.model().isBlank() ? "sonar" : request.model();

            List<Map<String, String>> messageMaps = new ArrayList<>();
            if (request.messages() != null) {
                for (LlmMessage m : request.messages()) {
                    Map<String, String> row = new LinkedHashMap<>();
                    row.put("role", m.role() != null ? m.role() : "user");
                    row.put("content", m.content() != null ? m.content() : "");
                    messageMaps.add(row);
                }
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("messages", messageMaps);
            body.put("temperature", request.temperature());
            body.put("max_tokens", request.maxTokens());

            String raw =
                    client.post()
                            .uri(CHAT_COMPLETIONS_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Authorization", "Bearer " + apiKey)
                            .body(body)
                            .retrieve()
                            .body(String.class);

            long latencyMs = System.currentTimeMillis() - start;
            return parsePerplexityResponse(raw, latencyMs);
        } catch (Exception e) {
            log.error("Perplexity chat completion failed", e);
            return errorResponse(
                    "Perplexity request failed: " + e.getMessage(),
                    System.currentTimeMillis() - start);
        }
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        return chat(request);
    }

    private LlmResponse parsePerplexityResponse(String raw, long latencyMs) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            String content = "";
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                content = choices.get(0).path("message").path("content").asText("");
            }

            String jsonContent = null;
            if (content != null && !content.isBlank()) {
                String trimmed = content.strip();
                if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                    try {
                        objectMapper.readTree(trimmed);
                        jsonContent = trimmed;
                    } catch (Exception ignored) {
                    }
                }
            }

            Map<String, Object> usage = new LinkedHashMap<>();
            JsonNode usageNode = root.path("usage");
            if (!usageNode.isMissingNode()) {
                usage.put("prompt_tokens", usageNode.path("prompt_tokens").asLong(0));
                usage.put("completion_tokens", usageNode.path("completion_tokens").asLong(0));
                usage.put("total_tokens", usageNode.path("total_tokens").asLong(0));
            } else {
                usage.put("prompt_tokens", 0L);
                usage.put("completion_tokens", 0L);
                usage.put("total_tokens", 0L);
            }

            Map<String, Object> rawMeta = new LinkedHashMap<>();
            rawMeta.put("id", root.path("id").asText(null));
            rawMeta.put("model", root.path("model").asText(null));

            if (root.has("citations") && !root.get("citations").isNull()) {
                rawMeta.put("citations", objectMapper.convertValue(root.get("citations"), Object.class));
            }

            return new LlmResponse(content, jsonContent, usage, latencyMs, rawMeta);
        } catch (Exception e) {
            log.error("Failed to parse Perplexity response", e);
            return new LlmResponse(
                    "Failed to parse Perplexity response: " + e.getMessage(),
                    null,
                    Map.of("prompt_tokens", 0L, "completion_tokens", 0L, "total_tokens", 0L),
                    latencyMs,
                    Map.of("parseError", true));
        }
    }

    private String extractApiKey(String storedSecret) {
        if (storedSecret == null || storedSecret.isBlank()) return null;
        try {
            JsonNode root = objectMapper.readTree(storedSecret);
            if (root.has("apiKey")) {
                return root.get("apiKey").asText(null);
            }
        } catch (Exception ignored) {
        }
        return storedSecret;
    }

    private LlmResponse errorResponse(String message, long latencyMs) {
        return new LlmResponse(
                message,
                null,
                Map.of("prompt_tokens", 0L, "completion_tokens", 0L, "total_tokens", 0L),
                latencyMs,
                Map.of("error", true));
    }
}
