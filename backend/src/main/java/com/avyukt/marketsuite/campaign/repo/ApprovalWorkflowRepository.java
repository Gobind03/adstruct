package com.avyukt.marketsuite.campaign.repo;

import com.avyukt.marketsuite.campaign.domain.ApprovalState;
import com.avyukt.marketsuite.campaign.domain.ApprovalWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApprovalWorkflowRepository extends JpaRepository<ApprovalWorkflow, UUID> {
    List<ApprovalWorkflow> findByState(ApprovalState state);
    Optional<ApprovalWorkflow> findByEntityTypeAndEntityId(String entityType, UUID entityId);
}
