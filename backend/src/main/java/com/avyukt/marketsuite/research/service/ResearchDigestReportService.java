package com.avyukt.marketsuite.research.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.identity.service.PermissionService;
import com.avyukt.marketsuite.research.domain.ResearchDigestReport;
import com.avyukt.marketsuite.research.repo.ResearchDigestReportRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ResearchDigestReportService {

    private final ResearchDigestReportRepository digestReportRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PermissionService permissionService;

    public ResearchDigestReportService(
            ResearchDigestReportRepository digestReportRepository,
            WorkspaceRepository workspaceRepository,
            PermissionService permissionService) {
        this.digestReportRepository = digestReportRepository;
        this.workspaceRepository = workspaceRepository;
        this.permissionService = permissionService;
    }

    @Transactional(readOnly = true)
    public List<ResearchDigestReport> list(UUID workspaceId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        return digestReportRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
    }

    @Transactional(readOnly = true)
    public ResearchDigestReport get(UUID workspaceId, UUID digestId) {
        Workspace ws = workspaceRepository
                .findById(workspaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", workspaceId));
        UUID orgId = ws.getOrg().getId();
        permissionService.requireResearchRead(orgId, workspaceId);
        ResearchDigestReport report = digestReportRepository
                .findById(digestId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchDigestReport", "id", digestId));
        if (!report.getWorkspace().getId().equals(workspaceId)) {
            throw new ResourceNotFoundException("ResearchDigestReport", "id", digestId);
        }
        return report;
    }
}
