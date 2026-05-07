package com.avyukt.marketsuite.ai.service.gateway;

import com.avyukt.marketsuite.common.secret.SecretStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
public class CustomHttpGateway implements LlmGateway {

    private static final String CHAT_SUFFIX = "/chat/completions";

    private final RestClient client;
    private final ObjectMapper objectMapper;
    private final SecretStore secretStore;
    private final boolean enableCustomHttp;

    public CustomHttpGateway(
            ObjectMapper objectMapper,
            SecretStore secretStore,
            @Value("${app.ai.enable-custom-http:false}") boolean enableCustomHttp) {
        this.client = RestClient.builder().build();
        this.objectMapper = objectMapper;
        this.secretStore = secretStore;
        this.enableCustomHttp = enableCustomHttp;
    }

    @Override
    public LlmResponse chat(LlmRequest request) {
        long start = System.currentTimeMillis();
        if (!enableCustomHttp) {
            return disabledResponse(System.currentTimeMillis() - start);
        }

        try {
            String base =
                    request.metadata() != null ? request.metadata().get("endpointBaseUrl") : null;
            if (base == null || base.isBlank()) {
                return errorResponse(
                        "Missing required metadata endpointBaseUrl for custom HTTP gateway.",
                        System.currentTimeMillis() - start);
            }
            String baseUrl = trimTrailingSlash(base);
            String url = baseUrl + CHAT_SUFFIX;

            String secretRef = request.metadata().get("secretRef");
            String authHeader = null;
            if (secretRef != null && !secretRef.isBlank()) {
                String apiKey = extractApiKey(secretStore.retrieve(secretRef));
                if (apiKey != null && !apiKey.isBlank()) {
                    authHeader = "Bearer " + apiKey;
                }
            }

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
            body.put("model", request.model());
            body.put("messages", messageMaps);
            body.put("temperature", request.temperature());
            body.put("max_tokens", request.maxTokens());

            String outputFormat = request.metadata() != null ? request.metadata().get("outputFormat") : null;
            if ("JSON".equalsIgnoreCase(outputFormat)) {
                body.put("response_format", Map.of("type", "json_object"));
            }

            RestClient.RequestBodySpec req =
                    client.post()
                            .uri(url)
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(body);
            if (authHeader != null) {
                req = req.header("Authorization", authHeader);
            }

            String raw = req.retrieve().body(String.class);
            long latencyMs = System.currentTimeMillis() - start;
            return parseOpenAiCompatibleResponse(raw, latencyMs);
        } catch (Exception e) {
            log.error("Custom HTTP chat completion failed", e);
            return errorResponse(
                    "Custom HTTP request failed: " + e.getMessage(),
                    System.currentTimeMillis() - start);
        }
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        return chat(request);
    }

    private LlmResponse disabledResponse(long latencyMs) {
        return new LlmResponse(
                "Custom HTTP gateway is disabled. Set app.ai.enable-custom-http=true to enable.",
                null,
                Map.of("prompt_tokens", 0L, "completion_tokens", 0L, "total_tokens", 0L),
                latencyMs,
                Map.of("disabled", true));
    }

    private static String trimTrailingSlash(String base) {
        String s = base.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    private LlmResponse parseOpenAiCompatibleResponse(String raw, long latencyMs) {
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

            return new LlmResponse(content, jsonContent, usage, latencyMs, rawMeta);
        } catch (Exception e) {
            log.error("Failed to parse custom HTTP LLM response", e);
            return new LlmResponse(
                    "Failed to parse LLM response: " + e.getMessage(),
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
