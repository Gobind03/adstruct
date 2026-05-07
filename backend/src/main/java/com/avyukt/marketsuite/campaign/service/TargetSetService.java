package com.avyukt.marketsuite.campaign.service;

import com.avyukt.marketsuite.campaign.api.dto.TargetSetRequest;
import com.avyukt.marketsuite.campaign.api.dto.TargetSetResponse;
import com.avyukt.marketsuite.campaign.api.mapper.TargetSetMapper;
import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import com.avyukt.marketsuite.campaign.domain.TargetSet;
import com.avyukt.marketsuite.campaign.repo.ConversationCampaignRepository;
import com.avyukt.marketsuite.campaign.repo.TargetSetRepository;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TargetSetService {

    private final TargetSetRepository targetSetRepository;
    private final ConversationCampaignRepository campaignRepository;
    private final TargetSetMapper mapper;

    public TargetSetService(TargetSetRepository targetSetRepository,
                            ConversationCampaignRepository campaignRepository,
                            TargetSetMapper mapper) {
        this.targetSetRepository = targetSetRepository;
        this.campaignRepository = campaignRepository;
        this.mapper = mapper;
    }

    public TargetSetResponse create(UUID campaignId, TargetSetRequest request) {
        ConversationCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", campaignId));
        TargetSet targetSet = mapper.toEntity(request);
        targetSet.setCampaign(campaign);
        return mapper.toResponse(targetSetRepository.save(targetSet));
    }

    @Transactional(readOnly = true)
    public List<TargetSetResponse> findByCampaignId(UUID campaignId) {
        return targetSetRepository.findByCampaignId(campaignId).stream()
                .map(mapper::toResponse).toList();
    }

    public TargetSetResponse update(UUID campaignId, UUID targetSetId, TargetSetRequest request) {
        TargetSet targetSet = targetSetRepository.findById(targetSetId)
                .orElseThrow(() -> new ResourceNotFoundException("TargetSet", "id", targetSetId));
        targetSet.setIntentType(request.intentType());
        targetSet.setTopicsJson(request.topicsJson());
        targetSet.setGeoJson(request.geoJson());
        targetSet.setNegativeTopicsJson(request.negativeTopicsJson());
        return mapper.toResponse(targetSetRepository.save(targetSet));
    }

    public void delete(UUID campaignId, UUID targetSetId) {
        if (!targetSetRepository.existsById(targetSetId)) {
            throw new ResourceNotFoundException("TargetSet", "id", targetSetId);
        }
        targetSetRepository.deleteById(targetSetId);
    }
}
