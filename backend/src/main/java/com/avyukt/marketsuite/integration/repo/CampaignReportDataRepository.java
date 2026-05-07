package com.avyukt.marketsuite.integration.repo;

import com.avyukt.marketsuite.integration.domain.CampaignReportData;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CampaignReportDataRepository extends JpaRepository<CampaignReportData, UUID> {

    Optional<CampaignReportData> findByIntegrationAccountIdAndExternalCampaignIdAndReportDate(
            UUID integrationAccountId, String externalCampaignId, LocalDate reportDate);

    @Query(value = "SELECT crd.* FROM campaign_report_data crd"
            + " JOIN integration_accounts ia ON ia.id = crd.integration_account_id"
            + " LEFT JOIN conversation_campaigns cc ON cc.id = crd.internal_campaign_id"
            + " WHERE ia.org_id = CAST(:orgId AS uuid)"
            + " AND (CAST(:accountId AS uuid) IS NULL OR crd.integration_account_id = CAST(:accountId AS uuid))"
            + " AND (CAST(:fromDate AS date) IS NULL OR crd.report_date >= CAST(:fromDate AS date))"
            + " AND (CAST(:toDate AS date) IS NULL OR crd.report_date <= CAST(:toDate AS date))"
            + " AND (CAST(:mappedOnly AS boolean) IS NULL"
            + "      OR (CAST(:mappedOnly AS boolean) = true AND crd.internal_campaign_id IS NOT NULL)"
            + "      OR (CAST(:mappedOnly AS boolean) = false AND crd.internal_campaign_id IS NULL))"
            + " ORDER BY crd.report_date DESC, crd.campaign_name ASC",
            nativeQuery = true)
    List<CampaignReportData> findFiltered(
            @Param("orgId") UUID orgId,
            @Param("accountId") UUID accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("mappedOnly") Boolean mappedOnly);

    @Query("SELECT r FROM CampaignReportData r"
            + " JOIN FETCH r.integrationAccount"
            + " LEFT JOIN FETCH r.internalCampaign"
            + " WHERE r.internalCampaign.id = :campaignId"
            + " ORDER BY r.reportDate DESC")
    List<CampaignReportData> findByInternalCampaignId(@Param("campaignId") UUID campaignId);

    @Modifying
    @Query("UPDATE CampaignReportData r"
            + " SET r.internalCampaign.id = :internalCampaignId"
            + " WHERE r.integrationAccount.id = :accountId"
            + " AND r.externalCampaignId = :externalCampaignId")
    int backfillInternalCampaignId(
            @Param("accountId") UUID accountId,
            @Param("externalCampaignId") String externalCampaignId,
            @Param("internalCampaignId") UUID internalCampaignId);

    @Query(value = "SELECT COALESCE(SUM(crd.spend), 0), COALESCE(SUM(crd.impressions), 0),"
            + " COALESCE(SUM(crd.clicks), 0), COALESCE(SUM(crd.conversions), 0),"
            + " COUNT(DISTINCT crd.external_campaign_id)"
            + " FROM campaign_report_data crd"
            + " JOIN integration_accounts ia ON ia.id = crd.integration_account_id"
            + " WHERE ia.org_id = CAST(:orgId AS uuid)"
            + " AND (CAST(:accountId AS uuid) IS NULL OR crd.integration_account_id = CAST(:accountId AS uuid))"
            + " AND (CAST(:fromDate AS date) IS NULL OR crd.report_date >= CAST(:fromDate AS date))"
            + " AND (CAST(:toDate AS date) IS NULL OR crd.report_date <= CAST(:toDate AS date))",
            nativeQuery = true)
    Object[] findSummary(
            @Param("orgId") UUID orgId,
            @Param("accountId") UUID accountId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);
}
