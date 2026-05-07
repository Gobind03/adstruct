package com.avyukt.marketsuite.campaign.service;

import com.avyukt.marketsuite.campaign.api.dto.CampaignCreateRequest;
import com.avyukt.marketsuite.campaign.api.dto.CampaignResponse;
import com.avyukt.marketsuite.campaign.api.dto.CampaignUpdateRequest;
import com.avyukt.marketsuite.campaign.api.mapper.CampaignMapper;
import com.avyukt.marketsuite.campaign.domain.CampaignObjective;
import com.avyukt.marketsuite.campaign.domain.CampaignStatus;
import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import com.avyukt.marketsuite.campaign.repo.ConversationCampaignRepository;
import com.avyukt.marketsuite.common.PagedResponse;
import com.avyukt.marketsuite.common.exception.BusinessException;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import com.avyukt.marketsuite.identity.domain.Workspace;
import com.avyukt.marketsuite.identity.repo.WorkspaceRepository;
import com.avyukt.marketsuite.integration.domain.IntegrationAccount;
import com.avyukt.marketsuite.integration.repo.IntegrationAccountRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class CampaignService {

    private final ConversationCampaignRepository campaignRepository;
    private final WorkspaceRepository workspaceRepository;
    private final IntegrationAccountRepository integrationRepository;
    private final CampaignMapper mapper;

    public CampaignService(ConversationCampaignRepository campaignRepository,
                           WorkspaceRepository workspaceRepository,
                           IntegrationAccountRepository integrationRepository,
                           CampaignMapper mapper) {
        this.campaignRepository = campaignRepository;
        this.workspaceRepository = workspaceRepository;
        this.integrationRepository = integrationRepository;
        this.mapper = mapper;
    }

    public CampaignResponse create(CampaignCreateRequest request) {
        Workspace workspace = workspaceRepository.findById(request.workspaceId())
                .orElseThrow(() -> new ResourceNotFoundException("Workspace", "id", request.workspaceId()));
        IntegrationAccount integration = integrationRepository.findById(request.integrationAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("IntegrationAccount", "id", request.integrationAccountId()));

        ConversationCampaign campaign = mapper.toEntity(request);
        campaign.setWorkspace(workspace);
        campaign.setIntegrationAccount(integration);
        campaign.setStatus(CampaignStatus.DRAFT);

        return mapper.toResponse(campaignRepository.save(campaign));
    }

    @Transactional(readOnly = true)
    public PagedResponse<CampaignResponse> findByWorkspace(UUID workspaceId,
                                                            CampaignStatus status,
                                                            CampaignObjective objective,
                                                            Pageable pageable) {
        Page<ConversationCampaign> page;
        if (status != null) {
            page = campaignRepository.findByWorkspaceIdAndStatus(workspaceId, status, pageable);
        } else if (objective != null) {
            page = campaignRepository.findByWorkspaceIdAndObjective(workspaceId, objective, pageable);
        } else {
            page = campaignRepository.findByWorkspaceId(workspaceId, pageable);
        }
        return PagedResponse.from(page.map(mapper::toResponse));
    }

    @Transactional(readOnly = true)
    public CampaignResponse findById(UUID id) {
        ConversationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", id));
        return mapper.toResponse(campaign);
    }

    public CampaignResponse update(UUID id, CampaignUpdateRequest request) {
        ConversationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", id));

        if (request.name() != null) campaign.setName(request.name());
        if (request.objective() != null) campaign.setObjective(request.objective());
        if (request.dailyBudget() != null) campaign.setDailyBudget(request.dailyBudget());
        if (request.lifetimeBudget() != null) campaign.setLifetimeBudget(request.lifetimeBudget());
        if (request.startDate() != null) campaign.setStartDate(request.startDate());
        if (request.endDate() != null) campaign.setEndDate(request.endDate());
        if (request.pacingMode() != null) campaign.setPacingMode(request.pacingMode());

        return mapper.toResponse(campaignRepository.save(campaign));
    }

    public CampaignResponse activate(UUID id) {
        ConversationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", id));
        if (campaign.getStatus() != CampaignStatus.DRAFT && campaign.getStatus() != CampaignStatus.PAUSED) {
            throw new BusinessException("Campaign can only be activated from DRAFT or PAUSED status");
        }
        campaign.setStatus(CampaignStatus.ACTIVE);
        return mapper.toResponse(campaignRepository.save(campaign));
    }

    public CampaignResponse pause(UUID id) {
        ConversationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", id));
        if (campaign.getStatus() != CampaignStatus.ACTIVE) {
            throw new BusinessException("Only ACTIVE campaigns can be paused");
        }
        campaign.setStatus(CampaignStatus.PAUSED);
        return mapper.toResponse(campaignRepository.save(campaign));
    }

    public CampaignResponse archive(UUID id) {
        ConversationCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", id));
        if (campaign.getStatus() == CampaignStatus.ARCHIVED) {
            throw new BusinessException("Campaign is already archived");
        }
        campaign.setStatus(CampaignStatus.ARCHIVED);
        return mapper.toResponse(campaignRepository.save(campaign));
    }
}
