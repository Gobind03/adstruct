package com.avyukt.marketsuite.campaign.service;

import com.avyukt.marketsuite.campaign.api.dto.SponsoredUnitRequest;
import com.avyukt.marketsuite.campaign.api.dto.SponsoredUnitResponse;
import com.avyukt.marketsuite.campaign.api.mapper.SponsoredUnitMapper;
import com.avyukt.marketsuite.campaign.domain.ConversationCampaign;
import com.avyukt.marketsuite.campaign.domain.SponsoredUnit;
import com.avyukt.marketsuite.campaign.repo.ConversationCampaignRepository;
import com.avyukt.marketsuite.campaign.repo.SponsoredUnitRepository;
import com.avyukt.marketsuite.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class SponsoredUnitService {

    private final SponsoredUnitRepository unitRepository;
    private final ConversationCampaignRepository campaignRepository;
    private final SponsoredUnitMapper mapper;

    public SponsoredUnitService(SponsoredUnitRepository unitRepository,
                                ConversationCampaignRepository campaignRepository,
                                SponsoredUnitMapper mapper) {
        this.unitRepository = unitRepository;
        this.campaignRepository = campaignRepository;
        this.mapper = mapper;
    }

    public SponsoredUnitResponse create(UUID campaignId, SponsoredUnitRequest request) {
        ConversationCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Campaign", "id", campaignId));
        SponsoredUnit unit = mapper.toEntity(request);
        unit.setCampaign(campaign);
        return mapper.toResponse(unitRepository.save(unit));
    }

    @Transactional(readOnly = true)
    public List<SponsoredUnitResponse> findByCampaignId(UUID campaignId) {
        return unitRepository.findByCampaignId(campaignId).stream()
                .map(mapper::toResponse).toList();
    }

    public SponsoredUnitResponse update(UUID campaignId, UUID unitId, SponsoredUnitRequest request) {
        SponsoredUnit unit = unitRepository.findById(unitId)
                .orElseThrow(() -> new ResourceNotFoundException("SponsoredUnit", "id", unitId));
        unit.setType(request.type());
        unit.setTitle(request.title());
        unit.setSnippet(request.snippet());
        unit.setCtaText(request.ctaText());
        unit.setLandingUrl(request.landingUrl());
        unit.setDisclaimer(request.disclaimer());
        return mapper.toResponse(unitRepository.save(unit));
    }

    public void delete(UUID campaignId, UUID unitId) {
        if (!unitRepository.existsById(unitId)) {
            throw new ResourceNotFoundException("SponsoredUnit", "id", unitId);
        }
        unitRepository.deleteById(unitId);
    }
}
