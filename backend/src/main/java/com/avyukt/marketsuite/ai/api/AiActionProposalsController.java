package com.avyukt.marketsuite.ai.api;

import com.avyukt.marketsuite.ai.api.dto.AiActionProposalResponse;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.service.AiActionProposalService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/ai/action-proposals")
@Tag(name = "AI Action Proposals")
@SecurityRequirement(name = "bearerAuth")
@Transactional(readOnly = true)
public class AiActionProposalsController {

    private final AiActionProposalService proposalService;
    private final PermissionService permissionService;
    private final WorkspaceRepository workspaceRepository;

    public AiActionProposalsController(
            AiActionProposalService proposalService,
            PermissionService permissionService,
            WorkspaceRepository workspaceRepository) {
        this.proposalService = proposalService;
        this.permissionService = permissionService;
        this.workspaceRepository = workspaceRepository;
    }

    @GetMapping
    @Operation(summary = "List AI action proposals for workspace")
    public ResponseEntity<List<AiActionProposalResponse>> list(
            @PathVariable UUID workspaceId, @RequestParam(required = false) String status) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);

        AgentActionStatus st = null;
        if (status != null && !status.isBlank()) {
            st = AgentActionStatus.valueOf(status.trim().toUpperCase());
        }
        List<AiActionProposalResponse> out =
                proposalService.list(workspaceId, st).stream().map(this::toProposalResponse).toList();
        return ResponseEntity.ok(out);
    }

    @GetMapping("/{proposalId}")
    @Operation(summary = "Get AI action proposal")
    public ResponseEntity<AiActionProposalResponse> get(
            @PathVariable UUID workspaceId, @PathVariable UUID proposalId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);
        AiActionProposal p = proposalService.get(proposalId);
        assertProposalWorkspace(p, workspaceId);
        return ResponseEntity.ok(toProposalResponse(p));
    }

    @PostMapping("/{proposalId}/submit")
    @Transactional
    @Operation(summary = "Submit AI action proposal for approval")
    public ResponseEntity<AiActionProposalResponse> submit(
            @PathVariable UUID workspaceId, @PathVariable UUID proposalId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiUse(ws.getOrg().getId(), workspaceId);
        AiActionProposal p = proposalService.get(proposalId);
        assertProposalWorkspace(p, workspaceId);
        return ResponseEntity.ok(toProposalResponse(proposalService.submit(proposalId)));
    }

    @PostMapping("/{proposalId}/approve")
    @Transactional
    @Operation(summary = "Approve AI action proposal")
    public ResponseEntity<AiActionProposalResponse> approve(
            @PathVariable UUID workspaceId,
            @PathVariable UUID proposalId,
            @RequestBody(required = false) String notes) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiActionApproval(ws.getOrg().getId(), workspaceId);
        AiActionProposal p = proposalService.get(proposalId);
        assertProposalWorkspace(p, workspaceId);
        return ResponseEntity.ok(toProposalResponse(proposalService.approve(proposalId, notes)));
    }

    @PostMapping("/{proposalId}/reject")
    @Transactional
    @Operation(summary = "Reject AI action proposal")
    public ResponseEntity<AiActionProposalResponse> reject(
            @PathVariable UUID workspaceId,
            @PathVariable UUID proposalId,
            @RequestBody(required = false) String notes) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiActionApproval(ws.getOrg().getId(), workspaceId);
        AiActionProposal p = proposalService.get(proposalId);
        assertProposalWorkspace(p, workspaceId);
        return ResponseEntity.ok(toProposalResponse(proposalService.reject(proposalId, notes)));
    }

    @PostMapping("/{proposalId}/execute")
    @Transactional
    @Operation(summary = "Execute approved AI action proposal")
    public ResponseEntity<AiActionProposalResponse> execute(
            @PathVariable UUID workspaceId, @PathVariable UUID proposalId) {
        var ws =
                workspaceRepository
                        .findById(workspaceId)
                        .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        permissionService.requireAiActionExecution(ws.getOrg().getId(), workspaceId);
        AiActionProposal p = proposalService.get(proposalId);
        assertProposalWorkspace(p, workspaceId);
        return ResponseEntity.ok(toProposalResponse(proposalService.execute(proposalId)));
    }

    private void assertProposalWorkspace(AiActionProposal p, UUID workspaceId) {
        if (!p.getWorkspace().getId().equals(workspaceId)) {
            throw new BusinessException("Proposal does not belong to this workspace");
        }
    }

    private AiActionProposalResponse toProposalResponse(AiActionProposal p) {
        return new AiActionProposalResponse(
                p.getId(),
                p.getWorkspace().getId(),
                p.getConversation() != null ? p.getConversation().getId() : null,
                p.getTitle(),
                p.getDescription(),
                p.getActionType(),
                p.getTargetEntityType(),
                p.getTargetEntityId(),
                p.getPayloadJson(),
                p.getStatus() != null ? p.getStatus().name() : null,
                p.getRequestedByUser() != null ? p.getRequestedByUser().getId() : null,
                p.getReviewedByUser() != null ? p.getReviewedByUser().getId() : null,
                p.getReviewNotes(),
                p.getExecutedAt(),
                p.getCreatedAt(),
                p.getUpdatedAt());
    }
}
