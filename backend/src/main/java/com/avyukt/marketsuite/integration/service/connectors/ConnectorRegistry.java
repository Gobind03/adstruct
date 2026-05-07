package com.avyukt.marketsuite.integration.service.connectors;

import com.avyukt.marketsuite.integration.domain.PlatformType;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ConnectorRegistry {

    private final Map<PlatformType, IntegrationConnector> connectors;

    public ConnectorRegistry(List<IntegrationConnector> connectorList) {
        this.connectors =
                connectorList.stream().collect(Collectors.toMap(IntegrationConnector::platformType, Function.identity()));
    }

    public Optional<IntegrationConnector> getConnector(PlatformType platformType) {
        return Optional.ofNullable(connectors.get(platformType));
    }

    public boolean hasConnector(PlatformType platformType) {
        return connectors.containsKey(platformType);
    }
}
