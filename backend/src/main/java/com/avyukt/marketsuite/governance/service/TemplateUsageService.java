package com.avyukt.marketsuite.governance.service;

import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.governance.api.dto.TemplateUsageRequest;
import com.avyukt.marketsuite.governance.api.dto.TemplateUsageResponse;
import com.avyukt.marketsuite.governance.api.mapper.GovernanceMapper;
import com.avyukt.marketsuite.governance.domain.TemplateUsage;
import com.avyukt.marketsuite.governance.repo.TemplateRepository;
import com.avyukt.marketsuite.governance.repo.TemplateUsageRepository;
import com.avyukt.marketsuite.identity.repo.UserRepository;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.security.SecurityUtils;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class TemplateUsageService {

    private final TemplateUsageRepository repository;
    private final TemplateRepository templateRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final GovernanceMapper mapper;

    public TemplateUsageService(
            TemplateUsageRepository repository,
            TemplateRepository templateRepository,
            WorkspaceRepository workspaceRepository,
            UserRepository userRepository,
            GovernanceMapper mapper) {
        this.repository = repository;
        this.templateRepository = templateRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    public TemplateUsageResponse recordUsage(UUID templateId, TemplateUsageRequest req) {
        if (!templateRepository.existsById(templateId)) {
            throw new ResourceNotFoundException("Template", "id", templateId);
        }
        TemplateUsage usage = TemplateUsage.builder()
                .template(templateRepository.getReferenceById(templateId))
                .workspace(workspaceRepository.getReferenceById(req.workspaceId()))
                .usedInEntityType(req.usedInEntityType())
                .usedInEntityId(req.usedInEntityId())
                .usedByUser(userRepository.getReferenceById(SecurityUtils.currentUserId()))
                .usedAt(OffsetDateTime.now())
                .build();
        TemplateUsage saved = repository.save(usage);
        return mapper.toUsageResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<TemplateUsageResponse> listByTemplate(UUID templateId) {
        return repository.findByTemplateIdOrderByUsedAtDesc(templateId).stream()
                .map(mapper::toUsageResponse)
                .toList();
    }
}
