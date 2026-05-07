package com.avyukt.marketsuite.research.api;

import com.avyukt.marketsuite.research.api.dto.ResearchLinkCreateRequest;
import com.avyukt.marketsuite.research.api.dto.ResearchLinkResponse;
import com.avyukt.marketsuite.research.domain.LinkedEntityType;
import com.avyukt.marketsuite.research.domain.RelationType;
import com.avyukt.marketsuite.research.domain.ResearchEntityType;
import com.avyukt.marketsuite.research.domain.ResearchLink;
import com.avyukt.marketsuite.research.service.ResearchLinkService;
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
@RequestMapping("/api/v1/workspaces/{workspaceId}/research/links")
@Tag(name = "Research")
@SecurityRequirement(name = "bearerAuth")
public class ResearchLinksController {

    private final ResearchLinkService researchLinkService;

    public ResearchLinksController(ResearchLinkService researchLinkService) {
        this.researchLinkService = researchLinkService;
    }

    @GetMapping
    @Operation(summary = "List research links")
    public ResponseEntity<List<ResearchLinkResponse>> list(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String researchEntityType,
            @RequestParam(required = false) UUID researchEntityId,
            @RequestParam(required = false) String linkedEntityType,
            @RequestParam(required = false) UUID linkedEntityId) {
        ResearchEntityType ret =
                researchEntityType != null && !researchEntityType.isBlank()
                        ? ResearchEntityType.valueOf(researchEntityType)
                        : null;
        LinkedEntityType let =
                linkedEntityType != null && !linkedEntityType.isBlank()
                        ? LinkedEntityType.valueOf(linkedEntityType)
                        : null;
        List<ResearchLink> items =
                researchLinkService.list(workspaceId, ret, researchEntityId, let, linkedEntityId);
        return ResponseEntity.ok(items.stream().map(this::toResearchLinkResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Create research link")
    public ResponseEntity<ResearchLinkResponse> create(
            @PathVariable UUID workspaceId, @Valid @RequestBody ResearchLinkCreateRequest request) {
        ResearchLink saved =
                researchLinkService.create(
                        workspaceId,
                        ResearchEntityType.valueOf(request.researchEntityType()),
                        request.researchEntityId(),
                        LinkedEntityType.valueOf(request.linkedEntityType()),
                        request.linkedEntityId(),
                        RelationType.valueOf(request.relationType()),
                        request.note());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResearchLinkResponse(saved));
    }

    @DeleteMapping("/{linkId}")
    @Operation(summary = "Delete research link")
    public ResponseEntity<Void> delete(@PathVariable UUID workspaceId, @PathVariable UUID linkId) {
        researchLinkService.delete(workspaceId, linkId);
        return ResponseEntity.noContent().build();
    }

    private ResearchLinkResponse toResearchLinkResponse(ResearchLink l) {
        return new ResearchLinkResponse(
                l.getId(),
                l.getWorkspace().getId(),
                l.getResearchEntityType().name(),
                l.getResearchEntityId(),
                l.getLinkedEntityType().name(),
                l.getLinkedEntityId(),
                l.getRelationType().name(),
                l.getNote(),
                l.getCreatedByUser().getId(),
                l.getCreatedAt());
    }
}
