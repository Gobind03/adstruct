package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.*;
import com.avyukt.marketsuite.research.domain.PersonaResearch;
import com.avyukt.marketsuite.research.service.PersonaResearchService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/personas")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class PersonaResearchController {

    private final PersonaResearchService personaResearchService;
    private final ObjectMapper objectMapper;

    public PersonaResearchController(PersonaResearchService personaResearchService, ObjectMapper objectMapper) {
        this.personaResearchService = personaResearchService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "List persona research entries")
    public ResponseEntity<List<PersonaResponse>> list(@PathVariable UUID workspaceId) {
        return ResponseEntity.ok(
                personaResearchService.list(workspaceId).stream().map(this::toPersonaResponse).toList());
    }

    @GetMapping("/{personaId}")
    @Operation(summary = "Get persona research")
    public ResponseEntity<PersonaResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID personaId) {
        return ResponseEntity.ok(toPersonaResponse(personaResearchService.get(workspaceId, personaId)));
    }

    @PostMapping
    @Operation(summary = "Create persona research")
    public ResponseEntity<PersonaResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody PersonaCreateRequest request) {
        try {
            String painsJson =
                    request.pains() != null ? objectMapper.writeValueAsString(request.pains()) : "[]";
            String objectionsJson =
                    request.objections() != null ? objectMapper.writeValueAsString(request.objections()) : "[]";
            String motivationsJson =
                    request.motivations() != null ? objectMapper.writeValueAsString(request.motivations()) : "[]";
            String channelsJson =
                    request.channels() != null ? objectMapper.writeValueAsString(request.channels()) : "[]";
            PersonaResearch saved =
                    personaResearchService.create(
                            workspaceId,
                            request.name(),
                            painsJson,
                            objectionsJson,
                            motivationsJson,
                            channelsJson,
                            request.language(),
                            request.sentiment(),
                            request.sourceSnapshotId());
            return ResponseEntity.status(HttpStatus.CREATED).body(toPersonaResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @PatchMapping("/{personaId}")
    @Operation(summary = "Update persona research")
    public ResponseEntity<PersonaResponse> update(
            @PathVariable UUID workspaceId,
            @PathVariable UUID personaId,
            @RequestBody PersonaPatchRequest patch) {
        try {
            String painsJson =
                    patch.pains() != null ? objectMapper.writeValueAsString(patch.pains()) : null;
            String objectionsJson =
                    patch.objections() != null ? objectMapper.writeValueAsString(patch.objections()) : null;
            String motivationsJson =
                    patch.motivations() != null ? objectMapper.writeValueAsString(patch.motivations()) : null;
            String channelsJson =
                    patch.channels() != null ? objectMapper.writeValueAsString(patch.channels()) : null;
            PersonaResearch saved =
                    personaResearchService.update(
                            workspaceId,
                            personaId,
                            patch.name(),
                            painsJson,
                            objectionsJson,
                            motivationsJson,
                            channelsJson,
                            patch.language(),
                            patch.sentiment());
            return ResponseEntity.ok(toPersonaResponse(saved));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DeleteMapping("/{personaId}")
    @Operation(summary = "Delete persona research")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID personaId) {
        personaResearchService.delete(workspaceId, personaId);
        return ResponseEntity.noContent().build();
    }

    private PersonaResponse toPersonaResponse(PersonaResearch p) {
        return new PersonaResponse(
                p.getId(),
                p.getWorkspace().getId(),
                p.getName(),
                parseJsonList(p.getPains()),
                parseJsonList(p.getObjections()),
                parseJsonList(p.getMotivations()),
                parseJsonList(p.getChannels()),
                p.getLanguage(),
                p.getSentiment() != null ? p.getSentiment().name() : null,
                p.getSourceSnapshot() != null ? p.getSourceSnapshot().getId() : null,
                p.getCreatedByUser().getId(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }

    private List<String> parseJsonList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
