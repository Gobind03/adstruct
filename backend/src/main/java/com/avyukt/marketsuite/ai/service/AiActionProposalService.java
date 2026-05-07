package com.avyukt.marketsuite.ai.service;

import com.avyukt.marketsuite.ai.domain.AiActionProposal;
import com.avyukt.marketsuite.ai.domain.AgentActionStatus;
import com.avyukt.marketsuite.ai.repo.AiActionProposalRepository;
import com.avyukt.marketsuite.campaign.repo.ApprovalWorkflowRepository;
import com.avyukt.marketsuite.campaign.service.ApprovalService;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@Slf4j
public class AiActionProposalService {

    private static final String ENTITY_TYPE = "AI_ACTION_PROPOSAL";

    private final AiActionProposalRepository proposalRepository;
    private final ApprovalService approvalService;
    private final ApprovalWorkflowRepository approvalWorkflowRepository;
    private final AuditService auditService;
    private final UserRepository userRepository;

    public AiActionProposalService(
            AiActionProposalRepository proposalRepository,
            ApprovalService approvalService,
            ApprovalWorkflowRepository approvalWorkflowRepository,
            AuditService auditService,
            UserRepository userRepository) {
        this.proposalRepository = proposalRepository;
        this.approvalService = approvalService;
        this.approvalWorkflowRepository = approvalWorkflowRepository;
        this.auditService = auditService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AiActionProposal> list(UUID workspaceId, AgentActionStatus status) {
        if (workspaceId == null) {
            throw new BusinessException("workspaceId is required");
        }
        if (status != null) {
            return proposalRepository.findByWorkspaceIdAndStatusOrderByCreatedAtDesc(workspaceId, status);
        }
        return proposalRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional(readOnly = true)
    public AiActionProposal get(UUID proposalId) {
        return proposalRepository
                .findById(proposalId)
                .orElseThrow(() -> new ResourceNotFoundException("AiActionProposal", "id", proposalId));
    }

    public AiActionProposal submit(UUID proposalId) {
        UUID actorId = SecurityUtils.currentUserId();
        AiActionProposal proposal = get(proposalId);
        approvalService.submit(ENTITY_TYPE, proposalId);
        auditService.log(
                proposal.getWorkspace().getOrg().getId(),
                proposal.getWorkspace().getId(),
                actorId,
                "AI_ACTION_PROPOSAL_SUBMIT",
                ENTITY_TYPE,
                proposalId,
                null,
                summarizeProposal(proposal));
        return proposal;
    }

    public AiActionProposal approve(UUID proposalId, String notes) {
        UUID actorId = SecurityUtils.currentUserId();
        AiActionProposal proposal = get(proposalId);
        UUID workflowId =
                approvalWorkflowRepository
                        .findByEntityTypeAndEntityId(ENTITY_TYPE, proposalId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                "No approval workflow found for proposal; submit the proposal first"))
                        .getId();
        approvalService.approve(workflowId, actorId, notes);

        AppUser reviewer =
                userRepository
                        .findById(actorId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", actorId));
        proposal.setStatus(AgentActionStatus.APPROVED);
        proposal.setReviewedByUser(reviewer);
        proposal.setReviewNotes(notes);
        AiActionProposal saved = proposalRepository.save(proposal);
        auditService.log(
                saved.getWorkspace().getOrg().getId(),
                saved.getWorkspace().getId(),
                actorId,
                "AI_ACTION_PROPOSAL_APPROVE",
                ENTITY_TYPE,
                proposalId,
                null,
                summarizeProposal(saved));
        return saved;
    }

    public AiActionProposal reject(UUID proposalId, String notes) {
        UUID actorId = SecurityUtils.currentUserId();
        AiActionProposal proposal = get(proposalId);
        UUID workflowId =
                approvalWorkflowRepository
                        .findByEntityTypeAndEntityId(ENTITY_TYPE, proposalId)
                        .orElseThrow(
                                () ->
                                        new BusinessException(
                                                "No approval workflow found for proposal; submit the proposal first"))
                        .getId();
        approvalService.reject(workflowId, actorId, notes);

        AppUser reviewer =
                userRepository
                        .findById(actorId)
                        .orElseThrow(() -> new ResourceNotFoundException("AppUser", "id", actorId));
        proposal.setStatus(AgentActionStatus.REJECTED);
        proposal.setReviewedByUser(reviewer);
        proposal.setReviewNotes(notes);
        AiActionProposal saved = proposalRepository.save(proposal);
        auditService.log(
                saved.getWorkspace().getOrg().getId(),
                saved.getWorkspace().getId(),
                actorId,
                "AI_ACTION_PROPOSAL_REJECT",
                ENTITY_TYPE,
                proposalId,
                null,
                summarizeProposal(saved));
        return saved;
    }

    public AiActionProposal execute(UUID proposalId) {
        UUID actorId = SecurityUtils.currentUserId();
        AiActionProposal proposal = get(proposalId);
        if (proposal.getStatus() != AgentActionStatus.APPROVED) {
            throw new BusinessException("Only APPROVED proposals can be executed");
        }
        proposal.setStatus(AgentActionStatus.EXECUTED);
        proposal.setExecutedAt(java.time.OffsetDateTime.now());
        AiActionProposal saved = proposalRepository.save(proposal);
        auditService.log(
                saved.getWorkspace().getOrg().getId(),
                saved.getWorkspace().getId(),
                actorId,
                "AI_ACTION_PROPOSAL_EXECUTE",
                ENTITY_TYPE,
                proposalId,
                null,
                summarizeProposal(saved));
        return saved;
    }

    private String summarizeProposal(AiActionProposal p) {
        return "{\"id\":\"" + p.getId() + "\",\"status\":\"" + p.getStatus() + "\"}";
    }
}
