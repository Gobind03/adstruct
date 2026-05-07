package com.avyukt.marketsuite.ai.service.tools;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ToolRegistry {

    private final Map<String, AiTool> toolsByName;

    public ToolRegistry(List<AiTool> tools) {
        this.toolsByName = tools == null || tools.isEmpty()
                ? Map.of()
                : Collections.unmodifiableMap(tools.stream()
                        .collect(Collectors.toMap(AiTool::name, Function.identity(), (a, b) -> a)));
    }

    public Optional<AiTool> getTool(String name) {
        return Optional.ofNullable(toolsByName.get(name));
    }

    public List<AiTool> getAllTools() {
        return List.copyOf(toolsByName.values());
    }

    public List<AiTool> getEnabledTools() {
        return getAllTools();
    }
}
