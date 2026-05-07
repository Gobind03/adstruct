package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.ResourceType;
import java.util.Map;

public record DiscoveredResource(ResourceType type, String externalResourceId, String displayName, Map<String, Object> meta) {}
