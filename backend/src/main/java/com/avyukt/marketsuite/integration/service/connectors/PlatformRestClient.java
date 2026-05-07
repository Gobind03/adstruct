package com.avyukt.marketsuite.integration.service.connectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Component
public class PlatformRestClient {

    private static final Logger log = LoggerFactory.getLogger(PlatformRestClient.class);
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PlatformRestClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public JsonNode getWithBearer(String url, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return exchange(url, HttpMethod.GET, new HttpEntity<>(headers));
    }

    public JsonNode getWithQueryToken(String url, String accessToken) {
        String separator = url.contains("?") ? "&" : "?";
        return exchange(url + separator + "access_token=" + accessToken, HttpMethod.GET, new HttpEntity<>(new HttpHeaders()));
    }

    public JsonNode getWithHeader(String url, String headerName, String headerValue) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(headerName, headerValue);
        return exchange(url, HttpMethod.GET, new HttpEntity<>(headers));
    }

    public JsonNode getWithBearerAndHeaders(String url, String accessToken, Map<String, String> extraHeaders) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        extraHeaders.forEach(headers::set);
        return exchange(url, HttpMethod.GET, new HttpEntity<>(headers));
    }

    public JsonNode postFormForToken(String tokenUrl, Map<String, String> params) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        params.forEach(form::add);
        return exchange(tokenUrl, HttpMethod.POST, new HttpEntity<>(form, headers));
    }

    public JsonNode postJsonWithBearer(String url, String accessToken, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers));
    }

    public JsonNode postJsonWithHeader(String url, String headerName, String headerValue, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(headerName, headerValue);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers));
    }

    private JsonNode exchange(String url, HttpMethod method, HttpEntity<?> entity) {
        try {
            ResponseEntity<String> response = restTemplate.exchange(URI.create(url), method, entity, String.class);
            if (response.getBody() == null) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(response.getBody());
        } catch (HttpClientErrorException e) {
            log.warn("Platform API error: {} {} -> {}", method, url, e.getStatusCode());
            try {
                return objectMapper.readTree(e.getResponseBodyAsString());
            } catch (Exception ex) {
                throw new PlatformApiException(
                        "Platform API error: " + e.getStatusCode() + " " + e.getResponseBodyAsString(), e);
            }
        } catch (Exception e) {
            throw new PlatformApiException("Failed to call platform API: " + url, e);
        }
    }
}
