package com.avyukt.marketsuite.campaign.service;

import com.avyukt.marketsuite.campaign.api.dto.ApprovalResponse;
import com.avyukt.marketsuite.campaign.api.mapper.ApprovalMapper;
import com.avyukt.marketsuite.campaign.domain.ApprovalState;
import com.avyukt.marketsuite.campaign.domain.ApprovalWorkflow;
import com.avyukt.marketsuite.campaign.repo.ApprovalWorkflowRepository;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ApprovalService {

    private final ApprovalWorkflowRepository repository;
    private final ApprovalMapper mapper;

    public ApprovalService(ApprovalWorkflowRepository repository, ApprovalMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public ApprovalResponse submit(String entityType, UUID entityId) {
        repository.findByEntityTypeAndEntityId(entityType, entityId).ifPresent(existing -> {
            if (existing.getState() == ApprovalState.IN_REVIEW) {
                throw new BusinessException("Entity is already in review");
            }
        });
        ApprovalWorkflow workflow = ApprovalWorkflow.builder()
                .entityType(entityType)
                .entityId(entityId)
                .state(ApprovalState.IN_REVIEW)
                .build();
        return mapper.toResponse(repository.save(workflow));
    }

    public ApprovalResponse approve(UUID id, UUID reviewerUserId, String notes) {
        ApprovalWorkflow workflow = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalWorkflow", "id", id));
        if (workflow.getState() != ApprovalState.IN_REVIEW) {
            throw new BusinessException("Only IN_REVIEW approvals can be approved");
        }
        workflow.setState(ApprovalState.APPROVED);
        workflow.setReviewerUserId(reviewerUserId);
        workflow.setNotes(notes);
        return mapper.toResponse(repository.save(workflow));
    }

    public ApprovalResponse reject(UUID id, UUID reviewerUserId, String notes) {
        ApprovalWorkflow workflow = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ApprovalWorkflow", "id", id));
        if (workflow.getState() != ApprovalState.IN_REVIEW) {
            throw new BusinessException("Only IN_REVIEW approvals can be rejected");
        }
        workflow.setState(ApprovalState.REJECTED);
        workflow.setReviewerUserId(reviewerUserId);
        workflow.setNotes(notes);
        return mapper.toResponse(repository.save(workflow));
    }

    @Transactional(readOnly = true)
    public List<ApprovalResponse> findPending() {
        return repository.findByState(ApprovalState.IN_REVIEW).stream()
                .map(mapper::toResponse).toList();
    }
}
