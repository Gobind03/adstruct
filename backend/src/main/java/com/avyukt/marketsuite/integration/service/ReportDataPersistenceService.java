package com.avyukt.marketsuite.integration.service;

import com.avyukt.marketsuite.campaign.domain.CampaignStatus;
import com.avyukt.marketsuite.campaign.repo.ConversationCampaignRepository;
import com.avyukt.marketsuite.integration.domain.*;
import com.avyukt.marketsuite.integration.repo.CampaignReportDataRepository;
import com.avyukt.marketsuite.integration.repo.PlatformEntityMappingRepository;
import com.avyukt.marketsuite.integration.service.connectors.CampaignReportRow;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReportDataPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(ReportDataPersistenceService.class);

    static final Map<String, CampaignStatus> EXTERNAL_STATUS_MAP = Map.of(
            "ACTIVE", CampaignStatus.ACTIVE,
            "ENABLED", CampaignStatus.ACTIVE,
            "PAUSED", CampaignStatus.PAUSED,
            "ARCHIVED", CampaignStatus.ARCHIVED,
            "REMOVED", CampaignStatus.ARCHIVED);

    private final CampaignReportDataRepository reportDataRepo;
    private final PlatformEntityMappingRepository mappingRepo;
    private final ConversationCampaignRepository campaignRepo;

    public ReportDataPersistenceService(
            CampaignReportDataRepository reportDataRepo,
            PlatformEntityMappingRepository mappingRepo,
            ConversationCampaignRepository campaignRepo) {
        this.reportDataRepo = reportDataRepo;
        this.mappingRepo = mappingRepo;
        this.campaignRepo = campaignRepo;
    }

    /**
     * Upsert a single campaign report row and resolve any existing entity mappings.
     * The syncJob parameter is nullable for webhook-sourced data.
     */
    public int persistReportRow(CampaignReportRow row, IntegrationSyncJob syncJob, IntegrationAccount account) {
        CampaignReportData data = reportDataRepo
                .findByIntegrationAccountIdAndExternalCampaignIdAndReportDate(
                        account.getId(), row.externalCampaignId(), row.date())
                .orElse(null);

        boolean isNew = data == null;
        if (isNew) {
            CampaignReportData.CampaignReportDataBuilder builder = CampaignReportData.builder()
                    .integrationAccount(account)
                    .platformType(account.getPlatformType())
                    .externalCampaignId(row.externalCampaignId())
                    .reportDate(row.date());
            if (syncJob != null) {
                builder.syncJob(syncJob);
                builder.workspace(syncJob.getWorkspace());
            }
            data = builder.build();
        } else if (syncJob != null) {
            data.setSyncJob(syncJob);
        }

        data.setCampaignName(row.campaignName());
        data.setCampaignStatus(row.status());
        data.setSpend(row.spend());
        data.setImpressions(row.impressions());
        data.setClicks(row.clicks());
        data.setCpc(row.cpc());
        data.setCpm(row.cpm());
        data.setCtr(row.ctr());
        data.setConversions(row.conversions());

        resolveMapping(data, account);

        reportDataRepo.save(data);
        return 1;
    }

    private void resolveMapping(CampaignReportData data, IntegrationAccount account) {
        List<PlatformEntityMapping> mappings = mappingRepo
                .findByIntegrationAccountIdAndExternalEntityTypeAndExternalEntityId(
                        account.getId(), "CAMPAIGN", data.getExternalCampaignId());

        if (mappings.isEmpty()) {
            return;
        }

        PlatformEntityMapping mapping = mappings.getFirst();
        UUID internalCampaignId = mapping.getInternalEntityId();

        campaignRepo.findById(internalCampaignId).ifPresent(campaign -> {
            data.setInternalCampaign(campaign);

            if (data.getCampaignStatus() != null) {
                CampaignStatus newStatus = EXTERNAL_STATUS_MAP.get(
                        data.getCampaignStatus().toUpperCase());
                if (newStatus != null && campaign.getStatus() != newStatus) {
                    log.info("Syncing campaign {} status: {} -> {}",
                            campaign.getId(), campaign.getStatus(), newStatus);
                    campaign.setStatus(newStatus);
                    campaignRepo.save(campaign);
                }
            }
        });
    }
}
