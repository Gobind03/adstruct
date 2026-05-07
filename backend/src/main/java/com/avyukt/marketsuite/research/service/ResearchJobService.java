package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.identity.domain.AppUser;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.AuditService;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.research.domain.JobStatus;
import com.avyukt.marketsuite.research.domain.JobType;
import com.avyukt.marketsuite.research.domain.ResearchJob;
import com.avyukt.marketsuite.research.repo.ResearchJobRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResearchJobService {

    private final ResearchJobRepository researchJobRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ResearchJobService(
            ResearchJobRepository researchJobRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            PermissionService permissionService,
            AuditService auditService,
            ObjectMapper objectMapper) {
        this.researchJobRepository = researchJobRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ResearchJob> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return researchJobRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional(readOnly = true)
    public ResearchJob get(UUID workspaceId, UUID jobId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        ResearchJob job = researchJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchJob", "id", jobId));
        assertWorkspaceMatch(job, workspaceId);
        return job;
    }

    public ResearchJob createJob(UUID workspaceId, JobType jobType, String inputJson) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        UUID actor = SecurityUtils.currentUserId();
        AppUser user = userRepository.getReferenceById(actor);
        String json = inputJson != null ? inputJson : "{}";
        ResearchJob job = ResearchJob.builder()
                .workspace(ws)
                .jobType(jobType)
                .status(JobStatus.QUEUED)
                .requestedByUser(user)
                .inputJson(json)
                .build();
        ResearchJob saved = researchJobRepository.save(job);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_JOB_CREATE",
                "ResearchJob",
                saved.getId(),
                null,
                toJson(saved));
        return saved;
    }

    public ResearchJob startJob(UUID jobId) {
        ResearchJob job = researchJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchJob", "id", jobId));
        UUID workspaceId = job.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        String before = toJson(job);
        UUID actor = SecurityUtils.currentUserId();
        job.setStatus(JobStatus.RUNNING);
        job.setStartedAt(OffsetDateTime.now());
        ResearchJob saved = researchJobRepository.save(job);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_JOB_START",
                "ResearchJob",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public ResearchJob completeJob(UUID jobId, String statsJson) {
        ResearchJob job = researchJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchJob", "id", jobId));
        UUID workspaceId = job.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        String before = toJson(job);
        UUID actor = SecurityUtils.currentUserId();
        job.setStatus(JobStatus.SUCCESS);
        job.setFinishedAt(OffsetDateTime.now());
        job.setStatsJson(statsJson);
        job.setErrorMessage(null);
        ResearchJob saved = researchJobRepository.save(job);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_JOB_COMPLETE",
                "ResearchJob",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    public ResearchJob failJob(UUID jobId, String errorMessage) {
        ResearchJob job = researchJobRepository
                .findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchJob", "id", jobId));
        UUID workspaceId = job.getWorkspace().getId();
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchAnalyst(orgId, workspaceId);
        String before = toJson(job);
        UUID actor = SecurityUtils.currentUserId();
        job.setStatus(JobStatus.FAILED);
        job.setFinishedAt(OffsetDateTime.now());
        job.setErrorMessage(errorMessage);
        ResearchJob saved = researchJobRepository.save(job);
        auditService.log(
                orgId,
                workspaceId,
                actor,
                "RESEARCH_JOB_FAIL",
                "ResearchJob",
                saved.getId(),
                before,
                toJson(saved));
        return saved;
    }

    private void assertWorkspaceMatch(ResearchJob job, UUID workspaceId) {
        if (!job.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("ResearchJob", "id", job.getId());
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
